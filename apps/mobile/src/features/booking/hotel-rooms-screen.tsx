import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { commerceApi, getFutureDate, useApiSession } from '@tripflix/api-client';
import { countBookingCartGuests, countRoomsForGuests, isValidTripDate } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { colors, spacing } from '@tripflix/tokens';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { DateRangeField } from '@/components/date-sheet';
import { Button, Notice, Row, Screen, Txt, ui } from '@/components/mobile-ui';
import { CommerceError } from './commerce-state';
import { CartLink, SelectionBar, Stepper } from './cart-ui';
import { saveBookingSelection, useBookingSelection } from './cart-store';
import { RoomCard, type Guests } from './hotel-parts';

const text = vi.commerce;
const hotelText = vi.hotel;
const MAX_GUESTS = 9;

/** Màn chọn phòng riêng (như Agoda): kỳ ở và số khách ở trên, từng loại phòng với các gói giá ở dưới. */
export function HotelRoomsScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
    infants?: string;
  }>();
  const { isReady } = useApiSession();
  const today = getFutureDate(0);
  const [dates, setDates] = useState({
    checkIn: params.checkIn && params.checkIn >= today ? params.checkIn : getFutureDate(1),
    checkOut: params.checkOut ?? getFutureDate(3),
  });
  const [guests, setGuests] = useState<Guests>({
    adults: Number(params.adults ?? 2) || 2,
    children: Number(params.children ?? 0) || 0,
    infants: Number(params.infants ?? 0) || 0,
  });
  const [stay, setStay] = useState({ ...dates, ...guests });
  const [isEditing, setEditing] = useState(false);
  const selection = useBookingSelection();
  const valid =
    isValidTripDate(dates.checkIn, today) &&
    dates.checkOut > dates.checkIn &&
    guests.adults >= 1 &&
    countBookingCartGuests(guests) <= MAX_GUESTS;
  const isUnchanged =
    dates.checkIn === stay.checkIn &&
    dates.checkOut === stay.checkOut &&
    guests.adults === stay.adults &&
    guests.children === stay.children &&
    guests.infants === stay.infants;
  const query = useQuery({
    queryKey: ['commerce', 'hotel', params.id, stay],
    enabled: isReady && !!params.id,
    queryFn: ({ signal }) =>
      commerceApi.getHotel(
        params.id!,
        { checkIn: stay.checkIn, checkOut: stay.checkOut, adults: stay.adults },
        signal,
      ),
    placeholderData: keepPreviousData,
  });
  const hotel = query.data;
  const canAdd = countBookingCartGuests(guests) < MAX_GUESTS;
  const nights = Math.max(1, Math.round((Date.parse(stay.checkOut) - Date.parse(stay.checkIn)) / 86_400_000));
  const formatDay = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/');
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
  return (
    <Screen
      background={colors.surface}
      title={hotel?.name ?? hotelText.rooms}
      right={<CartLink />}
      footer={
        selection.items.length ? <SelectionBar returnTo={`/hotel-rooms?id=${params.id ?? ''}`} /> : undefined
      }
    >
      {/* Tóm tắt kỳ ở, bấm Đổi mới mở phần chỉnh để màn chọn phòng gọn. */}
      <View
        style={{
          padding: spacing.md,
          gap: spacing.md,
          borderRadius: 20,
          backgroundColor: colors.seaMist,
        }}
      >
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Txt variant="label">
              {formatDay(stay.checkIn)} → {formatDay(stay.checkOut)} · {nights} {text.nights}
            </Txt>
            <Txt variant="small" style={ui.muted}>
              {stay.adults} {hotelText.adultsLabel.toLowerCase()}
              {stay.children ? ` · ${stay.children} ${hotelText.childrenLabel.toLowerCase()}` : ''}
              {stay.infants ? ` · ${stay.infants} ${hotelText.infantsLabel.toLowerCase()}` : ''}
            </Txt>
          </View>
          <Button tone="text" onPress={() => setEditing((value) => !value)}>
            {isEditing ? hotelText.showLess : hotelText.changeStay}
          </Button>
        </Row>
        {isEditing && (
          <>
            <DateRangeField
              startLabel={vi.api.checkIn}
              endLabel={vi.api.checkOut}
              start={dates.checkIn}
              end={dates.checkOut}
              min={today}
              onChange={({ start, end }) => setDates({ checkIn: start, checkOut: end })}
            />
            {guestRow(hotelText.adultsLabel, undefined, 'adults', 1)}
            {guestRow(hotelText.childrenLabel, hotelText.childrenHint, 'children', 0)}
            {guestRow(hotelText.infantsLabel, hotelText.infantsHint, 'infants', 0)}
            {!valid && <Notice tone="error">{text.invalidStay}</Notice>}
            <Button
              icon="search"
              disabled={!valid || !params.id || query.isFetching || isUnchanged}
              onPress={() => {
                // Đổi số khách thì phòng đang chọn đi theo đoàn mới, giống web.
                if (selection.items.length) saveBookingSelection({ ...selection, ...guests });
                setStay({ ...dates, ...guests });
                setEditing(false);
              }}
            >
              {hotelText.update}
            </Button>
          </>
        )}
      </View>
      <CommerceError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isFetching && <Txt>{vi.api.loading}</Txt>}
      {hotel && !hotel.isAvailable && <Notice tone="warning">{text.unavailable}</Notice>}
      {hotel?.rooms.map((room) => (
        <RoomCard
          key={room.productId}
          hotel={hotel}
          room={room}
          stay={stay}
          rooms={countRoomsForGuests({ ...stay, maxGuests: room.maxGuests })}
          isDisabled={query.isFetching}
        />
      ))}
    </Screen>
  );
}
