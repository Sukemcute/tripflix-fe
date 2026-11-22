'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  buildTripDraftFromOrder,
  createTripPlanDay,
  createTripPlanPoint,
  findTripOutboundFlight,
  getTripPlanCategory,
  isBookableTripPoint,
  moveTripPlanPoint,
  pickTripFlightDestination,
  sortTripPlanPointsByTime,
  TRIP_PLAN_CATEGORIES,
  TRIP_PLAN_MAX_DAYS,
  TRIP_PLAN_TIME_PATTERN,
  type TripPlanCategory,
  type TripPlanDayDraft,
  type TripPlanDraft,
  type TripPlanPointDraft,
} from '@tripflix/app-core';
import {
  commerceApi,
  getFutureDate,
  readPage,
  resolveImageMimeType,
  uploadImage,
  useApiSession,
  useFlightRoutes,
} from '@tripflix/api-client';
import { suggestControllerSuggest } from '@tripflix/api-client/core-api/discovery/discovery';
import { t, vi } from '@tripflix/i18n';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useDebouncedValue } from '../../shared/use-debounced-value';
import styles from './trip-plan-editor.module.css';

/** Dùng đúng chữ của trình soạn trên app để hai nơi giống nhau. */
const copy = vi.mobile.tripPlan.editor;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Soạn lộ trình khi đăng bài viết hoặc reel trên web, cùng mô hình và cách làm với app (TF105):
 * lấy từ chuyến đã đi hoặc tự nhập, poster, điểm đến, chi phí, mỗi ngày nhiều điểm có giờ, kéo để sắp lại.
 * Điểm chia hai tầng: loại điểm (Khách sạn, Máy bay đặt được; Gợi ý tham khảo) rồi loại gợi ý.
 */
export function ComposerTripPlanEditor({
  draft,
  onChange,
  disabled = false,
}: {
  draft: TripPlanDraft;
  onChange: (draft: TripPlanDraft) => void;
  disabled?: boolean;
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

  return (
    <fieldset className={styles.root} disabled={disabled}>
      <div className={styles.segment}>
        {(['trips', 'manual'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={source === value}
            className={`${styles.segmentItem} ${source === value ? styles.segmentActive : ''}`}
            onClick={() => {
              setSource(value);
              // Tự nhập thì lộ trình không còn gắn với đơn đã đặt, để bài không được xác thực "đã đi" sai.
              if (value === 'manual' && draft.bookingId) onChange({ ...draft, bookingId: null });
            }}
          >
            {value === 'trips' ? copy.sourceTrips : copy.sourceManual}
          </button>
        ))}
      </div>
      {source === 'trips' && (
        <PaidTripPicker
          pickedOrderId={draft.bookingId}
          onPick={(next) => {
            onChange({
              ...next,
              posterMediaId: draft.posterMediaId,
              destinationName: draft.destinationName,
              destinationPlaceId: draft.destinationPlaceId,
              estimatedCostPerPerson: draft.estimatedCostPerPerson,
              preserved: draft.preserved,
            });
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

      <label className={styles.field}>
        <span className={styles.label}>{copy.costLabel}</span>
        <input
          className={styles.input}
          inputMode="numeric"
          placeholder={copy.costPlaceholder}
          value={draft.estimatedCostPerPerson ? draft.estimatedCostPerPerson.toLocaleString('vi-VN') : ''}
          onChange={(event) => {
            const amount = Number(event.target.value.replace(/\D/g, ''));
            onChange({ ...draft, estimatedCostPerPerson: amount > 0 ? amount : null });
          }}
        />
      </label>

      <div className={styles.dayTabs} role="tablist">
        {draft.days.map((_, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={index === activeDay}
            className={`${styles.chip} ${index === activeDay ? styles.chipActive : ''}`}
            onClick={() => setDayIndex(index)}
          >
            {t('mobile.tripPlan.day', { day: index + 1 })}
          </button>
        ))}
        {draft.days.length < TRIP_PLAN_MAX_DAYS && (
          <button
            type="button"
            className={styles.chip}
            onClick={() => {
              onChange({ ...draft, days: [...draft.days, createTripPlanDay()] });
              setDayIndex(draft.days.length);
            }}
          >
            {`+ ${copy.addDay}`}
          </button>
        )}
      </div>

      <DayEditor
        key={activeDay}
        day={draft.days[activeDay]!}
        dayNumber={activeDay + 1}
        dayCount={draft.days.length}
        onChange={(day) => updateDay(activeDay, day)}
        destinationName={draft.destinationName}
        outbound={outbound}
        onAddReturn={(leg) => {
          // Khứ hồi: thêm chặng bay chiều về vào ngày cuối, đảo sân bay của chiều đi.
          const last = draft.days.length - 1;
          const point = createTripPlanPoint({ mode: 'flight', fromCode: leg.to, toCode: leg.from });
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
    </fieldset>
  );
}

/** Chặng bay chiều đi và đã có chiều về chưa (để hiện nút thêm chiều về). */
type TripOutbound = { from: string; to: string; hasReturn: boolean };

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
  if (trips.isPending) return <p className={styles.muted}>{vi.api.loading}</p>;
  if (!trips.data?.length) return <p className={styles.notice}>{copy.noPaidTrips}</p>;
  return (
    <div className={styles.list}>
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
          <button
            key={trip.orderId}
            type="button"
            aria-pressed={isPicked}
            className={`${styles.tripCard} ${isPicked ? styles.tripCardPicked : ''}`}
            onClick={() => onPick(buildTripDraftFromOrder(trip))}
          >
            <span className={`${styles.tripIcon} ${isPicked ? styles.tripIconPicked : ''}`}>
              <TripIcon name={flights ? 'plane' : 'bed'} />
            </span>
            <span className={styles.grow}>
              <strong className={styles.ellipsis}>{place}</strong>
              <span className={styles.muted}>
                {[
                  trip.startDate,
                  t('mobile.tripPlan.editor.tripSummary', { flights, rooms }),
                  isDone ? copy.tripDone : copy.tripUpcoming,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            {isPicked && <TripIcon name="check" />}
          </button>
        );
      })}
      <p className={styles.muted}>{copy.tripVerifyHint}</p>
    </div>
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => () => (previewUrl ? URL.revokeObjectURL(previewUrl) : undefined), [previewUrl]);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const mimeType = resolveImageMimeType(file.type, file.name);
      if (!mimeType) throw new Error('Unsupported image');
      const bitmap = await createImageBitmap(file);
      const assetId = await uploadImage({
        body: file,
        sizeBytes: file.size,
        mimeType,
        widthPx: bitmap.width,
        heightPx: bitmap.height,
      });
      bitmap.close();
      return { assetId, url: URL.createObjectURL(file) };
    },
    onSuccess: ({ assetId, url }) => {
      setPreviewUrl(url);
      onChange(assetId);
    },
  });
  const hasCustom = !!posterMediaId;
  return (
    <div className={styles.section}>
      <span className={styles.label}>{copy.poster}</span>
      <div className={styles.posterRow}>
        <div className={styles.poster}>
          {hasCustom && previewUrl ? (
            // Ảnh xem trước là blob cục bộ vừa chọn, next/image không tối ưu được.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className={styles.posterImage} />
          ) : (
            <TripIcon name={hasCustom ? 'image' : 'film'} />
          )}
        </div>
        <div className={styles.posterActions}>
          <button
            type="button"
            className={`${styles.chip} ${!hasCustom ? styles.chipActive : ''}`}
            onClick={() => onChange(null)}
          >
            {copy.posterVideo}
          </button>
          <button
            type="button"
            className={`${styles.chip} ${hasCustom ? styles.chipActive : ''}`}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? copy.posterUploading : copy.posterUpload}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) upload.mutate(file);
            }}
          />
        </div>
      </div>
      <p className={styles.muted}>{copy.posterHint}</p>
      {upload.isError && <p className={styles.error}>{copy.posterFailed}</p>}
    </div>
  );
}

const normalizeName = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

/** Gợi ý tìm kiếm của discovery (/api/suggest) theo một loại: nơi hoặc khách sạn. */
function useSuggest(type: 'place' | 'hotel', text: string) {
  const { isReady } = useApiSession();
  const query = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS);
  const result = useQuery({
    queryKey: ['discovery', 'suggest', type, query],
    enabled: isReady && query.length >= 2,
    staleTime: 60_000,
    queryFn: async ({ signal }) =>
      readPage((await suggestControllerSuggest({ q: query, types: type }, { signal })).data),
  });
  return (result.data?.items ?? []).filter((item) => item.type === type).slice(0, 6);
}

/** Điểm đến chọn từ ô tìm kiếm; gõ đúng tên một nơi trong danh sách thì coi như đã chọn. */
function DestinationPicker({
  name,
  placeId,
  onChange,
}: {
  name: string;
  placeId: string;
  onChange: (destination: { destinationName: string; destinationPlaceId: string }) => void;
}) {
  const options = useSuggest('place', placeId ? '' : name);
  const exactPlace = !placeId
    ? options.find((option) => normalizeName(option.name) === normalizeName(name))
    : undefined;
  useEffect(() => {
    if (exactPlace) onChange({ destinationName: exactPlace.name, destinationPlaceId: exactPlace.refId });
  }, [exactPlace, onChange]);
  return (
    <div className={styles.section}>
      <label className={styles.field}>
        <span className={styles.label}>{copy.destination}</span>
        <input
          className={styles.input}
          placeholder={copy.destinationSearch}
          value={name}
          maxLength={100}
          onChange={(event) => onChange({ destinationName: event.target.value, destinationPlaceId: '' })}
        />
      </label>
      {!!placeId && (
        <span className={styles.picked}>
          <TripIcon name="check" size={14} />
          {copy.destinationPicked}
        </span>
      )}
      {!placeId && options.length > 0 && (
        <ul className={styles.options}>
          {options.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                className={styles.option}
                onClick={() => onChange({ destinationName: place.name, destinationPlaceId: place.refId })}
              >
                <TripIcon name="pin" size={16} />
                <span className={styles.grow}>{place.name}</span>
                {!!place.subtitle && <span className={styles.muted}>{place.subtitle}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DayEditor({
  day,
  dayNumber,
  dayCount,
  onChange,
  destinationName,
  outbound,
  onAddReturn,
  onRemove,
}: {
  day: TripPlanDayDraft;
  dayNumber: number;
  dayCount: number;
  onChange: (day: TripPlanDayDraft) => void;
  destinationName: string;
  outbound: TripOutbound | null;
  onAddReturn: (outbound: { from: string; to: string }) => void;
  onRemove?: () => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(day.points.length === 1 ? day.points[0]!.key : null);
  // Kéo thả bằng chuột như kéo giữ trên app; bàn phím dùng mũi tên lên/xuống trên tay cầm.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const move = (from: number, to: number) => onChange(moveTripPlanPoint(day, from, to));
  const updatePoint = (key: string, patch: Partial<TripPlanPointDraft>) =>
    onChange({ points: day.points.map((point) => (point.key === key ? { ...point, ...patch } : point)) });
  return (
    <div className={styles.day}>
      <div className={styles.dayHeader}>
        <strong>{t('mobile.tripPlan.day', { day: dayNumber })}</strong>
        <div className={styles.dayActions}>
          {day.points.some((point) => TRIP_PLAN_TIME_PATTERN.test(point.time)) && (
            <button
              type="button"
              className={styles.textButton}
              onClick={() => onChange(sortTripPlanPointsByTime(day))}
            >
              {copy.sortByTime}
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              className={styles.iconButton}
              aria-label={t('mobile.tripPlan.editor.removeDay', { day: dayNumber })}
              onClick={onRemove}
            >
              <TripIcon name="trash" />
            </button>
          )}
        </div>
      </div>
      <ol className={styles.points}>
        {day.points.map((point, index) => (
          <li
            key={point.key}
            className={`${dragIndex === index ? styles.dragging : ''} ${
              overIndex === index && dragIndex !== null && dragIndex !== index
                ? dragIndex < index
                  ? styles.dropAfter
                  : styles.dropBefore
                : ''
            }`}
            onDragOver={(event) => {
              if (dragIndex === null) return;
              event.preventDefault();
              setOverIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex !== null) move(dragIndex, index);
              setDragIndex(null);
              setOverIndex(null);
            }}
          >
            <PointRow
              point={point}
              isOpen={openKey === point.key}
              onToggle={() => setOpenKey(openKey === point.key ? null : point.key)}
              onChange={(patch) => updatePoint(point.key, patch)}
              destinationName={destinationName}
              dayCount={dayCount}
              outbound={outbound}
              onAddReturn={onAddReturn}
              onRemove={() => onChange({ points: day.points.filter((item) => item.key !== point.key) })}
              handleProps={{
                draggable: true,
                onDragStart: (event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  setDragIndex(index);
                },
                onDragEnd: () => {
                  setDragIndex(null);
                  setOverIndex(null);
                },
                onKeyDown: (event: KeyboardEvent) => {
                  if (event.key === 'ArrowUp' && index > 0) {
                    event.preventDefault();
                    move(index, index - 1);
                  }
                  if (event.key === 'ArrowDown' && index < day.points.length - 1) {
                    event.preventDefault();
                    move(index, index + 1);
                  }
                },
              }}
            />
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={styles.textButton}
        onClick={() => {
          const point = createTripPlanPoint();
          onChange({ points: [...day.points, point] });
          setOpenKey(point.key);
        }}
      >
        {`+ ${copy.addPoint}`}
      </button>
    </div>
  );
}

type PointKind = 'hotel' | 'flight' | 'suggestion';
const KIND_ICONS: Record<PointKind, IconName> = { hotel: 'bed', flight: 'plane', suggestion: 'bulb' };
const CATEGORY_ICONS: Record<TripPlanCategory, IconName> = {
  cafe: 'cafe',
  food: 'food',
  fun: 'fun',
  other: 'pin',
};

function PointRow({
  point,
  isOpen,
  onToggle,
  onChange,
  destinationName,
  dayCount,
  outbound,
  onAddReturn,
  onRemove,
  handleProps,
}: {
  point: TripPlanPointDraft;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<TripPlanPointDraft>) => void;
  destinationName: string;
  dayCount: number;
  outbound: TripOutbound | null;
  onAddReturn: (outbound: { from: string; to: string }) => void;
  onRemove: () => void;
  handleProps: Pick<
    React.HTMLAttributes<HTMLButtonElement>,
    'draggable' | 'onDragStart' | 'onDragEnd' | 'onKeyDown'
  >;
}) {
  const routes = useFlightRoutes();
  const isBookable = isBookableTripPoint(point);
  const isHotel = point.kind === 'hotel';
  const kind: PointKind = isHotel ? 'hotel' : point.mode === 'flight' ? 'flight' : 'suggestion';
  const summary =
    point.title.trim() ||
    (isHotel
      ? copy.pickHotel
      : point.mode === 'flight' && point.fromCode && point.toCode
        ? `${point.fromCode} → ${point.toCode}`
        : point.mode
          ? vi.mobile.tripPlan.modes[point.mode]
          : copy.newPoint);
  const headIcon: IconName = isHotel
    ? 'bed'
    : point.mode === 'flight'
      ? 'plane'
      : point.mode
        ? 'bus'
        : CATEGORY_ICONS[getTripPlanCategory(point)];
  const origins = routes.data?.map((route) => route.airport) ?? [];
  const destinationsOf = (from: string) =>
    routes.data?.find((route) => route.airport === from)?.destinations ?? [];
  const destinations = destinationsOf(point.fromCode).map((item) => item.code);
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
  const isTimeInvalid = !!point.time && !TRIP_PLAN_TIME_PATTERN.test(point.time);

  const kinds: { key: PointKind; label: string; patch: Partial<TripPlanPointDraft> }[] = [
    {
      key: 'hotel',
      label: copy.hotelKind,
      patch: { kind: 'hotel', mode: null, title: isHotel ? point.title : '' },
    },
    {
      key: 'flight',
      label: vi.mobile.tripPlan.modes.flight,
      patch: { kind: 'activity', mode: 'flight', hotelId: '' },
    },
    { key: 'suggestion', label: copy.suggestionKind, patch: { kind: 'activity', mode: null, hotelId: '' } },
  ];

  return (
    <div className={`${styles.point} ${isOpen ? styles.pointOpen : ''}`}>
      <div className={styles.pointHead}>
        <button
          type="button"
          className={styles.handle}
          aria-label={vi.api.composerTripDragHint}
          title={vi.api.composerTripDragHint}
          {...handleProps}
        >
          <TripIcon name="grip" />
        </button>
        <button type="button" className={styles.pointBody} aria-expanded={isOpen} onClick={onToggle}>
          <span className={styles.time}>
            {TRIP_PLAN_TIME_PATTERN.test(point.time) ? point.time : '--:--'}
          </span>
          <span className={isBookable ? styles.iconBookable : styles.iconMuted}>
            <TripIcon name={headIcon} />
          </span>
          <span className={styles.grow}>
            <strong className={styles.ellipsis}>{summary}</strong>
            <span className={isBookable ? styles.tagBookable : styles.muted}>
              {isBookable ? copy.bookable : copy.reference}
            </span>
          </span>
        </button>
        <button type="button" className={styles.iconButton} aria-label={copy.removePoint} onClick={onRemove}>
          <TripIcon name="close" />
        </button>
      </div>
      {isOpen && (
        <div className={styles.pointForm}>
          <div className={styles.row}>
            <label className={`${styles.field} ${styles.timeField}`}>
              <span className={styles.label}>{copy.pointTime}</span>
              <input
                className={`${styles.input} ${isTimeInvalid ? styles.inputError : ''}`}
                placeholder="HH:mm"
                maxLength={5}
                value={point.time}
                aria-invalid={isTimeInvalid}
                onChange={(event) => onChange({ time: event.target.value })}
              />
            </label>
            {!isHotel && (
              <label className={`${styles.field} ${styles.grow}`}>
                <span className={styles.label}>{point.mode ? copy.transportTitle : copy.activity}</span>
                <input
                  className={styles.input}
                  placeholder={copy.activityPlaceholder}
                  maxLength={200}
                  value={point.title}
                  onChange={(event) => onChange({ title: event.target.value })}
                />
              </label>
            )}
          </div>
          {isTimeInvalid && <p className={styles.error}>{vi.api.composerTripTimeError}</p>}

          {/* Tầng 1: loại điểm (đặt được hay chỉ gợi ý) — ô lớn có icon. Tầng 2 bên dưới chỉ là loại của gợi ý. */}
          <span className={styles.levelLabel}>{copy.pointKindLabel}</span>
          <div className={styles.kindRow} aria-label={copy.pointKindLabel}>
            {kinds.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={kind === option.key}
                className={`${styles.kindOption} ${kind === option.key ? styles.kindOptionSelected : ''}`}
                onClick={() => onChange(option.patch)}
              >
                <TripIcon name={KIND_ICONS[option.key]} size={20} />
                {option.label}
              </button>
            ))}
          </div>
          {kind === 'suggestion' && !point.mode && (
            <div className={styles.subPanel}>
              <span className={styles.levelLabel}>{copy.suggestionCategoryLabel}</span>
              <div className={styles.subChips} aria-label={copy.suggestionCategoryLabel}>
                {TRIP_PLAN_CATEGORIES.map((category) => {
                  const isSelected = getTripPlanCategory(point) === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={isSelected}
                      className={`${styles.subChip} ${isSelected ? styles.subChipSelected : ''}`}
                      onClick={() => onChange({ category })}
                    >
                      <TripIcon name={CATEGORY_ICONS[category]} size={14} />
                      {vi.mobile.tripBuilder.activityKinds[category]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isHotel && (
            <HotelChooser
              point={point}
              destinationName={destinationName}
              dayCount={dayCount}
              onChange={onChange}
            />
          )}

          {point.mode === 'flight' && (
            <>
              <span className={styles.muted}>{copy.fromCode}</span>
              <div className={styles.chips}>
                {origins.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`${styles.chip} ${point.fromCode === code ? styles.chipActive : ''}`}
                    onClick={() => chooseOrigin(code)}
                  >
                    {code}
                  </button>
                ))}
              </div>
              {!!point.fromCode && (
                <>
                  <span className={styles.muted}>{copy.toCode}</span>
                  <div className={styles.chips}>
                    {destinations.map((code) => (
                      <button
                        key={code}
                        type="button"
                        className={`${styles.chip} ${point.toCode === code ? styles.chipActive : ''}`}
                        onClick={() => onChange({ toCode: code })}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {isOutbound && !outbound.hasReturn && (
                <button type="button" className={styles.textButton} onClick={() => onAddReturn(outbound)}>
                  {copy.addReturnFlight}
                </button>
              )}
            </>
          )}

          {point.mode !== 'flight' && !isHotel && (
            <label className={styles.field}>
              <span className={styles.label}>{copy.location}</span>
              <input
                className={styles.input}
                maxLength={200}
                value={point.location}
                onChange={(event) => onChange({ location: event.target.value })}
              />
            </label>
          )}
          <label className={styles.field}>
            <span className={styles.label}>{copy.transportNote}</span>
            <input
              className={styles.input}
              maxLength={200}
              value={point.note}
              onChange={(event) => onChange({ note: event.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

/**
 * Chọn khách sạn trong danh mục rồi chọn loại phòng, như màn tìm khách sạn → chọn phòng trên app.
 * Lộ trình chưa có ngày đi nên xem phòng theo kỳ mẫu (14 ngày tới, số đêm theo số ngày của lộ trình).
 */
function HotelChooser({
  point,
  destinationName,
  dayCount,
  onChange,
}: {
  point: TripPlanPointDraft;
  destinationName: string;
  dayCount: number;
  onChange: (patch: Partial<TripPlanPointDraft>) => void;
}) {
  const { isReady } = useApiSession();
  const [isSearching, setSearching] = useState(!point.hotelId);
  const [text, setText] = useState(point.hotelId ? '' : destinationName);
  const options = useSuggest('hotel', isSearching ? text : '');
  const nights = Math.max(1, dayCount - 1);
  const checkIn = getFutureDate(14);
  const checkOut = getFutureDate(14 + nights);
  const hotel = useQuery({
    queryKey: ['commerce', 'hotel', point.hotelId, checkIn, checkOut, 'trip-plan-pick'],
    enabled: isReady && !!point.hotelId && !isSearching,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => commerceApi.getHotel(point.hotelId, { checkIn, checkOut, adults: 2 }, signal),
  });
  const roomOptions = (hotel.data?.rooms ?? [])
    .filter((room) => room.isAvailable)
    .flatMap((room) =>
      room.ratePlans.map((rate) => ({
        value: `${room.productId}|${rate.code}`,
        productId: room.productId,
        ratePlanCode: rate.code,
        label: [room.name, rate.name].join(' · '),
      })),
    );

  if (isSearching) {
    return (
      <div className={styles.hotelChoice}>
        <label className={styles.field}>
          <span className={styles.label}>{copy.pickHotel}</span>
          <input
            className={styles.input}
            placeholder={copy.hotelSearch}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <span className={styles.muted}>{copy.pickHotelHint}</span>
        {options.length > 0 && (
          <ul className={styles.options}>
            {options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className={styles.option}
                  onClick={() => {
                    onChange({
                      hotelId: option.refId,
                      title: option.name,
                      productId: '',
                      ratePlanCode: '',
                      roomName: '',
                    });
                    setSearching(false);
                  }}
                >
                  <TripIcon name="bed" size={16} />
                  <span className={styles.grow}>{option.name}</span>
                  {!!option.subtitle && <span className={styles.muted}>{option.subtitle}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!!point.hotelId && (
          <button type="button" className={styles.textButton} onClick={() => setSearching(false)}>
            {vi.api.cancel}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className={styles.hotelChoice}>
      <div className={styles.hotelPicked}>
        <span className={styles.iconHotel}>
          <TripIcon name="bed" size={20} />
        </span>
        <span className={styles.grow}>
          <strong className={styles.ellipsis}>{point.title || copy.pickHotel}</strong>
          <span className={styles.muted}>{point.roomName || copy.pickRoomHint}</span>
        </span>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => {
            setText(destinationName);
            setSearching(true);
          }}
        >
          {copy.changeHotel}
        </button>
      </div>
      {roomOptions.length > 0 && (
        <label className={styles.field}>
          <span className={styles.label}>{vi.api.composerTripRoom}</span>
          <select
            className={styles.input}
            value={point.productId && point.ratePlanCode ? `${point.productId}|${point.ratePlanCode}` : ''}
            onChange={(event) => {
              const picked = roomOptions.find((option) => option.value === event.target.value);
              onChange(
                picked
                  ? { productId: picked.productId, ratePlanCode: picked.ratePlanCode, roomName: picked.label }
                  : { productId: '', ratePlanCode: '', roomName: '' },
              );
            }}
          >
            <option value="">{copy.pickRoomHint}</option>
            {roomOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

type IconName =
  | 'bed'
  | 'plane'
  | 'bulb'
  | 'cafe'
  | 'food'
  | 'fun'
  | 'pin'
  | 'bus'
  | 'grip'
  | 'close'
  | 'trash'
  | 'check'
  | 'image'
  | 'film';

/** Icon nét mảnh cùng kiểu với icon của trang mạng xã hội web. */
function TripIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    bed: (
      <>
        <path d="M3 18v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8" />
        <path d="M3 14h18M3 18v2M21 18v2M7 11h3" />
      </>
    ),
    plane: (
      <path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L16 6.5a2 2 0 0 1 3 3l-4 4 1 7.5L14.5 22 12 14.5l-3 3V20l-1.5 1-1-3-3-1 1-1.5h2.5z" />
    ),
    bulb: (
      <>
        <path d="M9 18h6M10 21h4" />
        <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
      </>
    ),
    cafe: (
      <>
        <path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
        <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M12 3v2" />
      </>
    ),
    food: <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-2 6 0 8v10M17 3v18" />,
    fun: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
    bus: (
      <>
        <rect x="5" y="3" width="14" height="15" rx="2" />
        <path d="M5 11h14M8 18v2M16 18v2M8.5 14.5h.01M15.5 14.5h.01" />
      </>
    ),
    grip: <path d="M5 8h14M5 12h14M5 16h14" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m21 16-5-5-9 9" />
      </>
    ),
    film: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}
