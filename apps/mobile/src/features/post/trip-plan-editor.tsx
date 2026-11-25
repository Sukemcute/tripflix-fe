import { useMutation, useQuery } from '@tanstack/react-query';
import {
  buildTripDraftFromOrder,
  createTripPlanDay,
  createTripPlanDraft,
  createTripPlanPoint,
  findTripOutboundFlight,
  getTripPlanCategory,
  pickTripFlightDestination,
  isBookableTripPoint,
  moveTripPlanPoint,
  sortTripPlanPointsByTime,
  TRIP_PLAN_CATEGORIES,
  TRIP_PLAN_MAX_DAYS,
  TRIP_PLAN_TIME_PATTERN,
  type TripPlanDayDraft,
  type TripPlanDraft,
  type TripPlanPointDraft,
} from '@tripflix/app-core';
import {
  commerceApi,
  getFutureDate,
  readPage,
  uploadImage,
  useApiSession,
  useFlightRoutes,
} from '@tripflix/api-client';
import { suggestControllerSuggest } from '@tripflix/api-client/core-api/discovery/discovery';
import { t, vi } from '@tripflix/i18n';
import { explorer as x, mobileLayout, radius, spacing } from '@tripflix/tokens';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { DragSortList } from './drag-sort-list';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Field, Icon, IconButton, Notice, Row, Txt } from '@/components/mobile-ui';
import { toPickedImage } from './image-source';
import { usePostHotelPick } from './post-hotel-pick-store';
import { ACTIVITY_ICONS } from '@/features/booking/activity-card';

const copy = vi.mobile.tripPlan.editor;

/**
 * Soạn lộ trình ngay trong màn đăng video (TF105): lấy từ chuyến đã đi hoặc tự nhập, chọn poster,
 * mỗi ngày nhiều điểm có giờ và phương tiện, sắp lại được. Chặng bay đủ sân bay và chỗ ở thì người xem đặt được.
 */
export function TripPlanEditor({
  draft,
  onChange,
  onDragChange,
}: {
  draft: TripPlanDraft;
  onChange: (draft: TripPlanDraft) => void;
  /** Báo màn ngoài đang kéo thẻ để khoá cuộn. */
  onDragChange?: (isDragging: boolean) => void;
}) {
  const [source, setSource] = useState<'trips' | 'manual'>(draft.bookingId ? 'trips' : 'manual');
  const [dayIndex, setDayIndex] = useState(0);
  const activeDay = Math.min(dayIndex, draft.days.length - 1);
  const outboundFlight = findTripOutboundFlight(draft);
  const outbound: TripOutbound | null = outboundFlight && {
    ...outboundFlight,
    hasReturn: draft.days.some((day) =>
      day.points.some(
        (point) =>
          point.mode === 'flight' &&
          point.fromCode === outboundFlight.to &&
          point.toCode === outboundFlight.from,
      ),
    ),
  };
  const updateDay = (index: number, day: TripPlanDayDraft) =>
    onChange({ ...draft, days: draft.days.map((current, i) => (i === index ? day : current)) });

  // Chọn khách sạn và loại phòng ở màn tìm khách sạn → chọn phòng, quay về thì gắn vào đúng điểm.
  const hotelPick = usePostHotelPick();
  useEffect(() => {
    if (!hotelPick) return;
    const point = draft.days.flatMap((day) => day.points).find((item) => item.key === hotelPick.key);
    if (
      !point ||
      (point.hotelId === hotelPick.hotelId &&
        point.productId === (hotelPick.productId ?? '') &&
        point.ratePlanCode === (hotelPick.ratePlanCode ?? ''))
    )
      return;
    onChange({
      ...draft,
      days: draft.days.map((day) => ({
        points: day.points.map((item) =>
          item.key === hotelPick.key
            ? {
                ...item,
                kind: 'hotel',
                hotelId: hotelPick.hotelId,
                title: hotelPick.hotelName,
                productId: hotelPick.productId ?? '',
                ratePlanCode: hotelPick.ratePlanCode ?? '',
                roomName: hotelPick.roomName
                  ? [hotelPick.roomName, hotelPick.rateName].filter(Boolean).join(' · ')
                  : '',
              }
            : item,
        ),
      })),
    });
  }, [hotelPick, draft, onChange]);

  // Lộ trình chưa có ngày đi; dùng kỳ ở mẫu chỉ để xem phòng còn bán, số đêm theo số ngày của lộ trình.
  const chooseHotel = (pointKey: string) => {
    const nights = Math.max(1, draft.days.length - 1);
    const checkIn = getFutureDate(14);
    const checkOut = getFutureDate(14 + nights);
    router.push({
      pathname: '/search',
      params: { pick: 'post', pickKey: pointKey, q: draft.destinationName, checkIn, checkOut, adults: '2' },
    });
  };

  return (
    <View style={styles.root}>
      <Row style={styles.segment}>
        {(['trips', 'manual'] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: source === value }}
            onPress={() => {
              setSource(value);
              // Tự nhập thì lộ trình không còn gắn với đơn đã đặt, để bài không được xác thực "đã đi" sai.
              if (value === 'manual' && draft.bookingId) onChange({ ...draft, bookingId: null });
            }}
            style={[styles.segmentItem, source === value && styles.segmentActive]}
          >
            <Txt style={[styles.segmentText, source === value && styles.segmentTextActive]}>
              {value === 'trips' ? copy.sourceTrips : copy.sourceManual}
            </Txt>
          </Pressable>
        ))}
      </Row>
      {source === 'trips' && (
        <PaidTripPicker
          pickedOrderId={draft.bookingId}
          onPick={(next) => {
            onChange({ ...next, posterMediaId: draft.posterMediaId, destinationName: draft.destinationName });
            setDayIndex(0);
          }}
        />
      )}

      <PosterPicker
        posterMediaId={draft.posterMediaId}
        onChange={(posterMediaId) => onChange({ ...draft, posterMediaId })}
      />

      <DestinationPicker
        name={draft.destinationName}
        placeId={draft.destinationPlaceId}
        onChange={(destination) => onChange({ ...draft, ...destination })}
      />
      <Field
        label={copy.costLabel}
        placeholder={copy.costPlaceholder}
        keyboardType="number-pad"
        value={draft.estimatedCostPerPerson ? draft.estimatedCostPerPerson.toLocaleString('vi-VN') : ''}
        onChangeText={(value) => {
          const amount = Number(value.replace(/\D/g, ''));
          onChange({ ...draft, estimatedCostPerPerson: amount > 0 ? amount : null });
        }}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
        {draft.days.map((_, index) => (
          <Chip key={index} selected={index === activeDay} onPress={() => setDayIndex(index)}>
            {t('mobile.tripPlan.day', { day: index + 1 })}
          </Chip>
        ))}
        {draft.days.length < TRIP_PLAN_MAX_DAYS && (
          <Chip
            onPress={() => {
              onChange({ ...draft, days: [...draft.days, createTripPlanDay()] });
              setDayIndex(draft.days.length);
            }}
          >
            {`+ ${copy.addDay}`}
          </Chip>
        )}
      </ScrollView>

      <DayEditor
        key={activeDay}
        day={draft.days[activeDay]!}
        dayNumber={activeDay + 1}
        onChange={(day) => updateDay(activeDay, day)}
        onChooseHotel={chooseHotel}
        onDragChange={onDragChange}
        destinationName={draft.destinationName}
        outbound={outbound}
        onAddReturn={(outbound) => {
          // Khứ hồi: thêm chặng bay chiều về vào ngày cuối, đảo sân bay của chiều đi.
          const last = draft.days.length - 1;
          const point = createTripPlanPoint({ mode: 'flight', fromCode: outbound.to, toCode: outbound.from });
          onChange({
            ...draft,
            days: draft.days.map((day, i) => (i === last ? { points: [...day.points, point] } : day)),
          });
          setDayIndex(last);
        }}
        onRemove={
          draft.days.length > 1
            ? () => {
                onChange({ ...draft, days: draft.days.filter((_, i) => i !== activeDay) });
                setDayIndex(Math.max(0, activeDay - 1));
              }
            : undefined
        }
      />
    </View>
  );
}

/** Chuyến đã thanh toán của chính người đăng; chọn thì dựng lại bản nháp từ đơn. */
function PaidTripPicker({
  pickedOrderId,
  onPick,
}: {
  pickedOrderId: string | null;
  onPick: (draft: TripPlanDraft) => void;
}) {
  const { isReady, user } = useApiSession();
  const trips = useQuery({
    queryKey: ['commerce', 'trips', 'paid-for-post'],
    enabled: isReady && !!user,
    queryFn: ({ signal }) => commerceApi.listTrips(undefined, signal),
    select: (page) => page.trips.filter((trip) => trip.status === 'paid'),
  });
  if (trips.isPending) return <Txt variant="caption">{vi.api.loading}</Txt>;
  if (!trips.data?.length) return <Notice>{copy.noPaidTrips}</Notice>;
  return (
    <View style={styles.list}>
      {trips.data.slice(0, 6).map((trip) => {
        const flights = trip.items.filter((item) => item.productType === 'flight').length;
        const rooms = trip.items.filter((item) => item.productType === 'room').length;
        const place =
          trip.items.find((item) => item.propertyName)?.propertyName ??
          trip.items.find((item) => item.toAirport)?.toAirport ??
          trip.items[0]?.productName ??
          '';
        const isPicked = pickedOrderId === trip.orderId;
        // Chỉ chuyến đã kết thúc mới được xác thực "đã đi" khi đăng; chuyến sắp tới vẫn dùng làm lộ trình được.
        const isDone = !!trip.endDate && trip.endDate < getFutureDate(0);
        return (
          <Pressable
            key={trip.orderId}
            accessibilityRole="button"
            accessibilityState={{ selected: isPicked }}
            onPress={() => onPick(buildTripDraftFromOrder(trip))}
            style={({ pressed }) => [
              styles.tripCard,
              isPicked && styles.tripCardPicked,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.tripIcon, isPicked && styles.tripIconPicked]}>
              <Icon
                name={flights ? 'airplane' : 'bed'}
                size={18}
                color={isPicked ? x.day.surface : x.day.link}
              />
            </View>
            <View style={styles.flex}>
              <Txt variant="label" numberOfLines={1}>
                {place}
              </Txt>
              <Txt variant="caption" style={styles.muted} numberOfLines={1}>
                {[
                  trip.startDate,
                  t('mobile.tripPlan.editor.tripSummary', { flights, rooms }),
                  isDone ? copy.tripDone : copy.tripUpcoming,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Txt>
            </View>
            {isPicked && <Icon name="checkmark-circle" size={20} color={x.day.link} />}
          </Pressable>
        );
      })}
      <Txt variant="caption" style={styles.muted}>
        {copy.tripVerifyHint}
      </Txt>
    </View>
  );
}

/** Poster mặc định là ảnh bìa video; tải ảnh khác lên thì dùng ảnh đó ở thẻ trong tab Đặt. */
function PosterPicker({
  posterMediaId,
  onChange,
}: {
  posterMediaId: string | null;
  onChange: (posterMediaId: string | null) => void;
}) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: async () => {
      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      });
      const asset = selection.canceled ? undefined : selection.assets[0];
      if (!asset) return null;
      const image = await toPickedImage(asset);
      if (!image) throw new Error('Unsupported image');
      const assetId = await uploadImage(image);
      return { assetId, uri: asset.uri };
    },
    onSuccess: (result) => {
      if (!result) return;
      setPreviewUri(result.uri);
      onChange(result.assetId);
    },
  });
  const hasCustom = !!posterMediaId;
  return (
    <View style={styles.section}>
      <Txt variant="label">{copy.poster}</Txt>
      <Row style={styles.posterRow}>
        <View style={styles.poster}>
          {hasCustom && previewUri ? (
            <Image source={previewUri} contentFit="cover" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.posterFallback}>
              <Icon name={hasCustom ? 'image-outline' : 'film-outline'} size={22} color={x.day.link} />
            </View>
          )}
        </View>
        <View style={styles.posterActions}>
          <Chip selected={!hasCustom} onPress={() => onChange(null)}>
            {copy.posterVideo}
          </Chip>
          <Chip selected={hasCustom} onPress={() => upload.mutate()}>
            {upload.isPending ? copy.posterUploading : copy.posterUpload}
          </Chip>
        </View>
      </Row>
      <Txt variant="caption" style={styles.muted}>
        {copy.posterHint}
      </Txt>
      {upload.isError && <Notice tone="error">{copy.posterFailed}</Notice>}
    </View>
  );
}

/** Chặng bay chiều đi và đã có chiều về chưa (để hiện nút thêm chiều về). */
type TripOutbound = { from: string; to: string; hasReturn: boolean };

function DayEditor({
  day,
  dayNumber,
  onChange,
  onChooseHotel,
  onDragChange,
  destinationName,
  outbound,
  onAddReturn,
  onRemove,
}: {
  onDragChange?: (isDragging: boolean) => void;
  day: TripPlanDayDraft;
  dayNumber: number;
  onChange: (day: TripPlanDayDraft) => void;
  onChooseHotel: (pointKey: string) => void;
  destinationName: string;
  outbound: TripOutbound | null;
  onAddReturn: (outbound: { from: string; to: string }) => void;
  onRemove?: () => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(day.points.length === 1 ? day.points[0]!.key : null);
  const updatePoint = (key: string, patch: Partial<TripPlanPointDraft>) =>
    onChange({ points: day.points.map((point) => (point.key === key ? { ...point, ...patch } : point)) });
  return (
    <View style={styles.day}>
      <Row style={styles.dayHeader}>
        <Txt variant="label">{t('mobile.tripPlan.day', { day: dayNumber })}</Txt>
        <Row style={{ gap: spacing.xs }}>
          {day.points.some((point) => TRIP_PLAN_TIME_PATTERN.test(point.time)) && (
            <Button tone="text" onPress={() => onChange(sortTripPlanPointsByTime(day))}>
              {copy.sortByTime}
            </Button>
          )}
          {onRemove && (
            <IconButton
              name="trash-outline"
              label={t('mobile.tripPlan.editor.removeDay', { day: dayNumber })}
              onPress={onRemove}
            />
          )}
        </Row>
      </Row>
      <DragSortList
        items={day.points}
        onMove={(from, to) => onChange(moveTripPlanPoint(day, from, to))}
        onDragChange={onDragChange}
        renderItem={(point, index, handle) => (
          <PointRow
            handle={handle}
            key={point.key}
            point={point}
            isOpen={openKey === point.key}
            onToggle={() => setOpenKey(openKey === point.key ? null : point.key)}
            onChange={(patch) => updatePoint(point.key, patch)}
            onChooseHotel={() => onChooseHotel(point.key)}
            destinationName={destinationName}
            outbound={outbound}
            onAddReturn={onAddReturn}
            onMoveUp={index > 0 ? () => onChange(moveTripPlanPoint(day, index, index - 1)) : undefined}
            onMoveDown={
              index < day.points.length - 1
                ? () => onChange(moveTripPlanPoint(day, index, index + 1))
                : undefined
            }
            onRemove={() => onChange({ points: day.points.filter((item) => item.key !== point.key) })}
          />
        )}
      />
      <Button
        tone="text"
        icon="add"
        onPress={() => {
          const point = createTripPlanPoint();
          onChange({ points: [...day.points, point] });
          setOpenKey(point.key);
        }}
      >
        {copy.addPoint}
      </Button>
    </View>
  );
}

function PointRow({
  point,
  isOpen,
  onToggle,
  onChange,
  onChooseHotel,
  destinationName,
  outbound,
  onAddReturn,
  handle,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  handle: (child: ReactNode) => ReactNode;
  point: TripPlanPointDraft;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<TripPlanPointDraft>) => void;
  onChooseHotel: () => void;
  destinationName: string;
  outbound: TripOutbound | null;
  onAddReturn: (outbound: { from: string; to: string }) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
}) {
  const routes = useFlightRoutes();
  const isBookable = isBookableTripPoint(point);
  const isHotel = point.kind === 'hotel';
  const summary =
    point.title.trim() ||
    (isHotel
      ? copy.pickHotel
      : point.mode === 'flight' && point.fromCode && point.toCode
        ? `${point.fromCode} → ${point.toCode}`
        : point.mode
          ? vi.mobile.tripPlan.modes[point.mode]
          : copy.newPoint);
  const origins = routes.data?.map((route) => route.airport) ?? [];
  const destinationsOf = (from: string) =>
    routes.data?.find((route) => route.airport === from)?.destinations ?? [];
  const destinations = destinationsOf(point.fromCode).map((d) => d.code);
  // Chọn sân bay đi thì sân bay đến mặc định theo điểm đến của chuyến, hoặc về lại nhà nếu là chiều về.
  const chooseOrigin = (from: string) =>
    onChange({
      fromCode: from,
      toCode: pickTripFlightDestination({
        from,
        destinations: destinationsOf(from),
        destinationName,
        outbound,
      }),
    });
  const isOutbound =
    point.mode === 'flight' && !!outbound && point.fromCode === outbound.from && point.toCode === outbound.to;

  return (
    <View style={[styles.point, isOpen && styles.pointOpen]}>
      {handle(
        <View
          style={styles.pointHead}
          accessibilityHint={copy.dragHint}
          // Đọc màn hình không kéo được: vẫn đưa lên, đưa xuống bằng thao tác trợ năng.
          accessibilityActions={[
            ...(onMoveUp ? [{ name: 'moveUp', label: copy.moveUp }] : []),
            ...(onMoveDown ? [{ name: 'moveDown', label: copy.moveDown }] : []),
          ]}
          onAccessibilityAction={(event) =>
            event.nativeEvent.actionName === 'moveUp' ? onMoveUp?.() : onMoveDown?.()
          }
        >
          <View style={styles.moveCol}>
            <Icon name="reorder-three" size={22} color={x.day.textSecondary} />
          </View>
          <Pressable accessibilityRole="button" onPress={onToggle} style={styles.pointBody}>
            <Txt style={styles.time}>{TRIP_PLAN_TIME_PATTERN.test(point.time) ? point.time : '--:--'}</Txt>
            <Icon
              name={
                isHotel
                  ? 'bed'
                  : point.mode === 'flight'
                    ? 'airplane'
                    : point.mode
                      ? 'bus-outline'
                      : ACTIVITY_ICONS[getTripPlanCategory(point)]
              }
              size={18}
              color={isBookable ? x.day.link : x.day.textSecondary}
            />
            <View style={styles.flex}>
              <Txt variant="label" numberOfLines={1}>
                {summary}
              </Txt>
              <Txt variant="caption" style={{ color: isBookable ? x.day.link : x.day.textSecondary }}>
                {isBookable ? copy.bookable : copy.reference}
              </Txt>
            </View>
          </Pressable>
          <IconButton name="close" label={copy.removePoint} onPress={onRemove} />
        </View>,
      )}
      {isOpen && (
        <View style={styles.pointForm}>
          <Row style={{ gap: spacing.sm }}>
            <View style={{ width: 96 }}>
              <Field
                label={copy.pointTime}
                placeholder="HH:mm"
                value={point.time}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
                onChangeText={(value) => onChange({ time: value })}
              />
            </View>
            {!isHotel && (
              <View style={styles.flex}>
                <Field
                  label={point.mode ? copy.transportTitle : copy.activity}
                  placeholder={copy.activityPlaceholder}
                  value={point.title}
                  maxLength={200}
                  onChangeText={(value) => onChange({ title: value })}
                />
              </View>
            )}
          </Row>
          {/* Tầng 1: loại điểm (đặt được hay chỉ gợi ý) — ô lớn, có icon. Tầng 2 bên dưới chỉ là loại của gợi ý. */}
          <Txt variant="caption" style={styles.levelLabel}>
            {copy.pointKindLabel}
          </Txt>
          <Row style={styles.kindRow}>
            {(
              [
                {
                  key: 'hotel',
                  icon: 'bed',
                  label: copy.hotelKind,
                  isSelected: isHotel,
                  patch: { kind: 'hotel', mode: null, title: isHotel ? point.title : '' },
                },
                {
                  key: 'flight',
                  icon: 'airplane',
                  label: vi.mobile.tripPlan.modes.flight,
                  isSelected: !isHotel && point.mode === 'flight',
                  patch: { kind: 'activity', mode: 'flight', hotelId: '' },
                },
                {
                  key: 'suggestion',
                  icon: 'bulb-outline',
                  label: copy.suggestionKind,
                  isSelected: !isHotel && point.mode !== 'flight',
                  patch: { kind: 'activity', mode: null, hotelId: '' },
                },
              ] as const
            ).map((option) => (
              <Pressable
                key={option.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: option.isSelected }}
                onPress={() => onChange(option.patch)}
                style={({ pressed }) => [
                  styles.kindOption,
                  option.isSelected && styles.kindOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Icon name={option.icon} size={20} color={option.isSelected ? x.day.surface : x.day.text} />
                <Txt variant="label" style={{ color: option.isSelected ? x.day.surface : x.day.text }}>
                  {option.label}
                </Txt>
              </Pressable>
            ))}
          </Row>
          {!isHotel && !point.mode && (
            // Loại gợi ý để người xem thấy icon cà phê, ăn uống, vui chơi; chưa chọn thì app đoán theo tên.
            <View style={styles.subPanel}>
              <Txt variant="caption" style={styles.levelLabel}>
                {copy.suggestionCategoryLabel}
              </Txt>
              <Row style={styles.subChips}>
                {TRIP_PLAN_CATEGORIES.map((category) => {
                  const isSelected = getTripPlanCategory(point) === category;
                  return (
                    <Pressable
                      key={category}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => onChange({ category })}
                      style={({ pressed }) => [
                        styles.subChip,
                        isSelected && styles.subChipSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Icon
                        name={ACTIVITY_ICONS[category]}
                        size={14}
                        color={isSelected ? x.day.link : x.day.textSecondary}
                      />
                      <Txt variant="small" style={{ color: isSelected ? x.day.link : x.day.textSecondary }}>
                        {vi.mobile.tripBuilder.activityKinds[category]}
                      </Txt>
                    </Pressable>
                  );
                })}
              </Row>
            </View>
          )}
          {isHotel && (
            <Pressable
              accessibilityRole="button"
              onPress={onChooseHotel}
              style={({ pressed }) => [styles.hotelChoice, pressed && styles.pressed]}
            >
              <Icon name="bed" size={20} color={x.day.text} />
              <View style={styles.flex}>
                <Txt variant="label" numberOfLines={1}>
                  {point.hotelId ? point.title : copy.pickHotel}
                </Txt>
                <Txt variant="caption" style={styles.muted} numberOfLines={1}>
                  {point.hotelId ? point.roomName || copy.pickRoomHint : copy.pickHotelHint}
                </Txt>
              </View>
              <Txt variant="label" style={{ color: x.day.text }}>
                {point.hotelId ? copy.changeHotel : copy.choose}
              </Txt>
            </Pressable>
          )}
          {point.mode === 'flight' && (
            <>
              <Txt variant="caption" style={styles.muted}>
                {copy.fromCode}
              </Txt>
              <Row style={styles.chips}>
                {origins.map((code) => (
                  <Chip key={code} selected={point.fromCode === code} onPress={() => chooseOrigin(code)}>
                    {code}
                  </Chip>
                ))}
              </Row>
              {!!point.fromCode && (
                <>
                  <Txt variant="caption" style={styles.muted}>
                    {copy.toCode}
                  </Txt>
                  <Row style={styles.chips}>
                    {destinations.map((code) => (
                      <Chip
                        key={code}
                        selected={point.toCode === code}
                        onPress={() => onChange({ toCode: code })}
                      >
                        {code}
                      </Chip>
                    ))}
                  </Row>
                </>
              )}
              {isOutbound && !outbound.hasReturn && (
                <Button tone="text" icon="swap-horizontal" onPress={() => onAddReturn(outbound)}>
                  {copy.addReturnFlight}
                </Button>
              )}
            </>
          )}
          {point.mode !== 'flight' && !isHotel && (
            <Field
              label={copy.location}
              value={point.location}
              maxLength={200}
              onChangeText={(value) => onChange({ location: value })}
            />
          )}
          <Field
            label={copy.transportNote}
            value={point.note}
            maxLength={200}
            onChangeText={(value) => onChange({ note: value })}
          />
        </View>
      )}
    </View>
  );
}

/** Điểm đến chọn từ ô tìm kiếm của discovery (/api/suggest, loại place); gõ tay vẫn giữ tên để tham khảo. */
const normalizeName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();

export function DestinationPicker({
  name,
  placeId,
  onChange,
  label,
  hideLabel,
}: {
  name: string;
  placeId: string;
  /** Nhãn ô nhập; mặc định "Điểm đến". */
  label?: string;
  /** Ẩn nhãn nhìn thấy khi nơi gọi đã có tiêu đề riêng. */
  hideLabel?: boolean;
  onChange: (destination: { destinationName: string; destinationPlaceId: string }) => void;
}) {
  const { isReady } = useApiSession();
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(placeId ? '' : name.trim()), 300);
    return () => clearTimeout(timer);
  }, [name, placeId]);
  const places = useQuery({
    queryKey: ['discovery', 'suggest', 'place', query],
    enabled: isReady && query.length >= 2,
    queryFn: async ({ signal }) =>
      readPage((await suggestControllerSuggest({ q: query, types: 'place' }, { signal })).data),
  });
  const options = (places.data?.items ?? []).filter((item) => item.type === 'place').slice(0, 6);
  // Gõ đúng tên một nơi trong danh sách (hà nội) thì coi như đã chọn nơi đó, khỏi phải bấm thêm.
  const exactPlace = !placeId
    ? options.find((option) => normalizeName(option.name) === normalizeName(name))
    : undefined;
  useEffect(() => {
    if (exactPlace) onChange({ destinationName: exactPlace.name, destinationPlaceId: exactPlace.refId });
  }, [exactPlace, onChange]);
  return (
    <View style={styles.section}>
      <Field
        label={label ?? copy.destination}
        hideLabel={hideLabel}
        placeholder={copy.destinationSearch}
        value={name}
        onChangeText={(value) => onChange({ destinationName: value, destinationPlaceId: '' })}
        maxLength={100}
      />
      {!!placeId && (
        <Row style={{ gap: spacing.xs, alignItems: 'center' }}>
          <Icon name="checkmark-circle" size={16} color={x.day.link} />
          <Txt variant="caption" style={{ color: x.day.link }}>
            {copy.destinationPicked}
          </Txt>
        </Row>
      )}
      {!placeId && options.length > 0 && (
        <View style={styles.list}>
          {options.map((place) => (
            <Pressable
              key={place.id}
              accessibilityRole="button"
              onPress={() => onChange({ destinationName: place.name, destinationPlaceId: place.refId })}
              style={({ pressed }) => [styles.placeOption, pressed && styles.pressed]}
            >
              <Icon name="location-outline" size={18} color={x.day.link} />
              <Txt style={styles.flex}>{place.name}</Txt>
              {!!place.subtitle && (
                <Txt variant="caption" style={styles.muted}>
                  {place.subtitle}
                </Txt>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/** Bản nháp trống khi bật lộ trình lần đầu. */
export const createEmptyTripDraft = createTripPlanDraft;

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  section: { gap: spacing.xs },
  list: { gap: spacing.sm },
  segment: {
    padding: 3,
    borderRadius: radius.md,
    backgroundColor: x.day.canvas,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs + 2, borderRadius: radius.sm },
  segmentActive: { backgroundColor: x.day.link },
  segmentText: { fontSize: 13, color: x.day.text },
  segmentTextActive: { color: x.brand.white },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: mobileLayout.cardRadius,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  tripCardPicked: { borderColor: x.day.link, backgroundColor: x.day.tintExplore },
  tripIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: x.day.tintExplore,
  },
  tripIconPicked: { backgroundColor: x.day.link },
  posterRow: { gap: spacing.md, alignItems: 'center' },
  poster: {
    width: 72,
    height: 96,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: x.day.tintExplore,
  },
  posterFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  posterActions: { gap: spacing.sm, alignItems: 'flex-start' },
  dayTabs: { gap: spacing.sm },
  day: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: mobileLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: x.day.line,
  },
  dayHeader: { alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  point: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  pointOpen: { borderColor: x.day.link },
  pointHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingRight: spacing.xs },
  moveCol: { width: 32, alignItems: 'center', paddingVertical: spacing.md },
  pointBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  time: { width: 44, fontSize: 12, color: x.day.textSecondary },
  pointForm: { gap: spacing.sm, padding: spacing.sm, paddingTop: 0 },
  hotelChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: x.day.tintWarm,
  },
  placeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: x.day.canvas,
  },
  chips: { flexWrap: 'wrap', gap: spacing.sm },
  levelLabel: { color: x.day.textSecondary },
  kindRow: { gap: spacing.sm },
  kindOption: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  kindOptionSelected: { backgroundColor: x.day.text, borderColor: x.day.text },
  subPanel: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: x.day.canvas,
  },
  subChips: { flexWrap: 'wrap', gap: spacing.xs },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: x.day.line,
    backgroundColor: x.day.surface,
  },
  subChipSelected: { borderColor: x.day.link, backgroundColor: x.day.tintExplore },
  muted: { color: x.day.textSecondary },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
});
