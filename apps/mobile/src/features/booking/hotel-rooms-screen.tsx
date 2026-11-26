import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { commerceApi, getFutureDate, useApiSession } from '@tripflix/api-client';
import {
  countBookingCartGuests,
  countRoomsForGuests,
  isValidTripDate,
  isValidTripPlanPassengers,
  isValidAssistantStay,
} from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { explorer as x } from '@tripflix/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { DateRangeField } from '@/components/date-sheet';
import { Button, Card, Empty, Notice, Row, Screen, Sheet, Txt, ui } from '@/components/mobile-ui';
import { InfoField } from '@/features/flights/flight-ui';
import { CommerceError } from './commerce-state';
import { CartLink, SelectionBar, Stepper } from './cart-ui';
import { saveBookingSelection, useBookingSelection } from './cart-store';
import { RoomCard, type Guests } from './hotel-parts';
import { saveTripPick } from './trip-booking-store';
import { LoadingDots } from '@/components/loading-dots';
import { savePostRoom } from '@/features/post/post-hotel-pick-store';

const text = vi.commerce;
const hotelText = vi.hotel;
const MAX_GUESTS = 9;

/** Màn chọn phòng riêng (như Agoda): kỳ ở và số khách ở trên, từng loại phòng với các gói giá ở dưới. */
export function HotelRoomsScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    pick?: string;
    pickId?: string;
    pickKey?: string;
    productId?: string;
    ratePlanCode?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
    infants?: string;
    fromTripi?: string;
  }>();
  // 'post': chọn phòng cho điểm khách sạn khi soạn lộ trình (TF105); dùng chung giao diện chọn của đặt lộ trình.
  const isPostPick = params.pick === 'post';
  const isTripPick = params.pick === 'trip' || isPostPick;
  const isTripi = params.fromTripi === '1';
  const { isReady } = useApiSession();
  const today = getFutureDate(0);
  const [dates, setDates] = useState({
    checkIn:
      isTripPick || isTripi
        ? (params.checkIn ?? '')
        : params.checkIn && params.checkIn >= today
          ? params.checkIn
          : getFutureDate(1),
    checkOut: params.checkOut ?? (isTripi ? '' : getFutureDate(3)),
  });
  const [guests, setGuests] = useState<Guests>({
    adults: isTripi ? Number(params.adults) : Number(params.adults ?? 2) || 2,
    children: isTripi ? Number(params.children) : Number(params.children ?? 0) || 0,
    infants: isTripi ? Number(params.infants) : Number(params.infants ?? 0) || 0,
  });
  const [stay, setStay] = useState({ ...dates, ...guests });
  const [isGuestsOpen, setGuestsOpen] = useState(false);
  const selection = useBookingSelection();
  const valid = isTripi
    ? isValidAssistantStay({ ...dates, ...guests }, today)
    : isValidTripDate(dates.checkIn, today) &&
      dates.checkOut > dates.checkIn &&
      (isTripPick
        ? isValidTripPlanPassengers(guests, MAX_GUESTS)
        : guests.adults >= 1 && countBookingCartGuests(guests) <= MAX_GUESTS);
  const isUnchanged =
    dates.checkIn === stay.checkIn &&
    dates.checkOut === stay.checkOut &&
    guests.adults === stay.adults &&
    guests.children === stay.children &&
    guests.infants === stay.infants;
  // Cùng khoá với màn khách sạn (chỉ ngày và người lớn, đúng tham số gửi API): mở danh sách phòng dùng lại dữ liệu
  // vừa tải, không gọi lại khi trẻ em, em bé khác 0.
  const hotelStay = { checkIn: stay.checkIn, checkOut: stay.checkOut, adults: stay.adults };
  const query = useQuery({
    queryKey: ['commerce', 'hotel', params.id, hotelStay],
    enabled: isReady && !!params.id && (!isTripi || isValidAssistantStay(stay, today)),
    queryFn: ({ signal }) => commerceApi.getHotel(params.id!, hotelStay, signal),
    placeholderData: keepPreviousData,
  });
  const hotel = query.data;
  const returnTo = isTripi
    ? `/hotel-rooms?${new URLSearchParams({
        id: params.id ?? '',
        fromTripi: '1',
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        adults: String(stay.adults),
        children: String(stay.children),
        infants: String(stay.infants),
      }).toString()}`
    : `/hotel-rooms?id=${params.id ?? ''}`;
  const canAdd = countBookingCartGuests(guests) < MAX_GUESTS;
  const nights = Math.max(1, Math.round((Date.parse(stay.checkOut) - Date.parse(stay.checkIn)) / 86_400_000));
  const formatDay = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/');
  const formatGuests = (count: Guests) =>
    [
      `${count.adults} ${hotelText.adultsLabel.toLowerCase()}`,
      count.children ? `${count.children} ${hotelText.childrenLabel.toLowerCase()}` : '',
      count.infants ? `${count.infants} ${hotelText.infantsLabel.toLowerCase()}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  const guestRow = (label: string, hint: string | undefined, key: keyof Guests, min: number) => (
    <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Txt variant="label">{label}</Txt>
        {hint && (
          <Txt variant="small" style={ui.muted}>
            {hint}
          </Txt>
        )}
      </View>
      <Stepper
        value={guests[key]}
        label={label}
        canDecrease={guests[key] > min}
        canIncrease={canAdd}
        onChange={(value) => setGuests((previous) => ({ ...previous, [key]: value }))}
      />
    </Row>
  );
  // Không có khách sạn thì kỳ ở và danh sách phòng đều vô nghĩa: chỉ hướng người dùng đi chọn khách sạn.
  if (!params.id)
    return (
      <Screen background={x.day.surface} title={hotelText.rooms}>
        <Empty
          pose="curious"
          title={hotelText.missingHotelTitle}
          body={hotelText.missingHotelBody}
          action={hotelText.missingHotelAction}
          onAction={() => router.replace('/explore')}
        />
      </Screen>
    );
  return (
    <Screen
      background={x.day.surface}
      title={hotel?.name ?? hotelText.rooms}
      right={isTripPick ? undefined : <CartLink />}
      footer={
        !isTripPick && selection.items.length && (!isTripi || (valid && isUnchanged)) ? (
          <SelectionBar returnTo={returnTo} />
        ) : undefined
      }
    >
      {isTripPick && (
        <Notice>
          {vi.mobile.tripPlan.pickRoomTitle} · {vi.mobile.tripPlan.pickNotice}
        </Notice>
      )}
      {/* Cùng dáng form tìm vé máy bay: ô ngày, ô số khách mở bảng chọn, nút cập nhật chỉ hiện khi đã đổi. */}
      <Card>
        {isTripPick ? (
          <InfoField
            icon="calendar-outline"
            label={hotelText.stayDates}
            value={`${formatDay(stay.checkIn)} → ${formatDay(stay.checkOut)} · ${nights} ${text.nights}`}
            isDisabled
          />
        ) : (
          <DateRangeField
            startLabel={hotelText.checkIn}
            endLabel={hotelText.checkOut}
            start={dates.checkIn}
            end={dates.checkOut}
            min={today}
            onChange={({ start, end }) => setDates({ checkIn: start, checkOut: end })}
          />
        )}
        <InfoField
          icon="people-outline"
          label={hotelText.guestsField}
          value={formatGuests(isTripPick ? stay : guests)}
          isDisabled={isTripPick}
          onPress={isTripPick ? undefined : () => setGuestsOpen(true)}
        />
        {!isTripPick && !isUnchanged && (
          <>
            {!valid && <Notice tone="error">{text.invalidStay}</Notice>}
            <Button
              icon="search"
              disabled={!valid || !params.id || query.isFetching}
              onPress={() => {
                // Đổi số khách thì phòng đang chọn đi theo đoàn mới, giống web.
                if (selection.items.length) saveBookingSelection({ ...selection, ...guests });
                setStay({ ...dates, ...guests });
              }}
            >
              {hotelText.update}
            </Button>
          </>
        )}
      </Card>
      {isGuestsOpen && (
        <Sheet title={hotelText.guestsSheet} visible onClose={() => setGuestsOpen(false)}>
          {guestRow(hotelText.adultsLabel, undefined, 'adults', 1)}
          {guestRow(hotelText.childrenLabel, hotelText.childrenHint, 'children', 0)}
          {guestRow(hotelText.infantsLabel, hotelText.infantsHint, 'infants', 0)}
          <Button onPress={() => setGuestsOpen(false)}>{vi.mobile.common.done}</Button>
        </Sheet>
      )}
      <CommerceError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isFetching && <LoadingDots />}
      {hotel && !hotel.isAvailable && <Notice tone="warning">{text.unavailable}</Notice>}
      {hotel && !query.isFetching && hotel.rooms.length === 0 && (
        <Empty
          compact
          pose="curious"
          title={hotelText.noRoomsTitle}
          body={hotelText.noRoomsBody}
          action={isTripPick ? undefined : hotelText.noRoomsAction}
          onAction={isTripPick ? undefined : () => setGuestsOpen(true)}
        />
      )}
      {hotel?.rooms.map((room) => (
        <RoomCard
          key={room.productId}
          hotel={hotel}
          room={room}
          stay={stay}
          rooms={countRoomsForGuests({ ...stay, maxGuests: room.maxGuests })}
          isDisabled={
            query.isFetching ||
            (isTripi && (!valid || !isUnchanged)) ||
            (isTripPick &&
              (!params.pickKey || (!isPostPick && !params.pickId) || !valid || !hotel.isAvailable))
          }
          pickedRatePlanCode={
            isTripPick && params.productId === room.productId ? params.ratePlanCode : undefined
          }
          onPick={
            isTripPick
              ? (ratePlanCode) => {
                  const rate = room.ratePlans.find((option) => option.code === ratePlanCode);
                  if (isPostPick && params.pickKey && rate?.totalPrice != null && room.isAvailable) {
                    savePostRoom(params.pickKey, {
                      productId: room.productId,
                      ratePlanCode,
                      roomName: room.name,
                      rateName: rate.name,
                      totalPrice: rate.totalPrice,
                    });
                    router.back();
                    return;
                  }
                  if (
                    !params.pickKey ||
                    !params.pickId ||
                    !hotel.isAvailable ||
                    !room.isAvailable ||
                    rate?.totalPrice == null ||
                    query.isFetching ||
                    !valid
                  )
                    return;
                  saveTripPick(params.pickKey, params.pickId, {
                    productId: room.productId,
                    ratePlanCode,
                    totalPrice: rate.totalPrice,
                    roomName: room.name,
                    rateName: rate.name,
                  });
                  router.back();
                }
              : undefined
          }
        />
      ))}
    </Screen>
  );
}
