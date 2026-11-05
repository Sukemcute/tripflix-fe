import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { commerceApi, getFutureDate, useApiSession } from '@tripflix/api-client';
import { isValidTripDate, shiftTripDate } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Field, money, Notice, PriceRow, Screen, Txt } from '@/components/mobile-ui';
import { CommerceError } from './commerce-state';
import { useCommerce } from './commerce-provider';

const text = vi.commerce;
export function CommerceHotelScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    sourcePostId?: string;
  }>();
  const { isReady } = useApiSession();
  const { setDraft } = useCommerce();
  const [checkIn, setCheckIn] = useState(params.checkIn ?? getFutureDate(1));
  const [checkOut, setCheckOut] = useState(params.checkOut ?? getFutureDate(3));
  const [adults, setAdults] = useState(params.adults ?? '2');
  const [stay, setStay] = useState({ checkIn, checkOut, adults: Number(adults) });
  const valid =
    isValidTripDate(checkIn, shiftTripDate(getFutureDate(0), -1)) &&
    isValidTripDate(checkOut, checkIn) &&
    checkOut > checkIn &&
    /^\d+$/.test(adults) &&
    Number(adults) >= 1 &&
    Number(adults) <= 9;
  const isUnchanged =
    checkIn === stay.checkIn && checkOut === stay.checkOut && Number(adults) === stay.adults;
  const query = useQuery({
    queryKey: ['commerce', 'hotel', params.id, stay],
    enabled:
      isReady &&
      !!params.id &&
      isValidTripDate(stay.checkIn, shiftTripDate(getFutureDate(0), -1)) &&
      isValidTripDate(stay.checkOut, stay.checkIn) &&
      Number.isInteger(stay.adults) &&
      stay.adults >= 1 &&
      stay.adults <= 9,
    queryFn: ({ signal }) => commerceApi.getHotel(params.id!, stay, signal),
  });
  const hotel = query.data;
  return (
    <Screen title={text.hotel}>
      {!params.id && <Notice>{text.noHotel}</Notice>}
      <Field
        label={vi.api.checkIn}
        value={checkIn}
        onChangeText={setCheckIn}
        placeholder="YYYY-MM-DD"
        maxLength={10}
      />
      <Field
        label={vi.api.checkOut}
        value={checkOut}
        onChangeText={setCheckOut}
        placeholder="YYYY-MM-DD"
        maxLength={10}
      />
      <Field
        label={vi.api.adults}
        value={adults}
        onChangeText={setAdults}
        keyboardType="number-pad"
        maxLength={1}
      />
      {!valid && <Notice tone="error">{text.invalidStay}</Notice>}
      <Button
        disabled={!valid || !params.id || query.isFetching}
        onPress={() => {
          setStay({ checkIn, checkOut, adults: Number(adults) });
          if (isUnchanged) void query.refetch();
        }}
      >
        {text.chooseStay}
      </Button>
      <CommerceError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isFetching && <Txt>{vi.api.loading}</Txt>}
      {hotel && (
        <>
          <Txt variant="title">{hotel.name}</Txt>
          <Txt>
            {hotel.province.name}
            {hotel.stars ? ` · ${hotel.stars} ★` : ''}
          </Txt>
          {(hotel.images.length ? hotel.images : hotel.thumbnail ? [hotel.thumbnail] : []).map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={{ width: '100%', height: 210 }}
              accessibilityLabel={hotel.name}
            />
          ))}
          <Txt>
            {hotel.stay.checkIn} → {hotel.stay.checkOut} · {hotel.stay.nights} {text.nights} ·{' '}
            {hotel.stay.adults} {text.guests}
          </Txt>
          {!hotel.isAvailable && <Notice tone="warning">{text.unavailable}</Notice>}
          <Txt variant="heading">{text.rooms}</Txt>
          {hotel.rooms.map((room) => (
            <Card key={room.productId}>
              <Txt variant="heading">{room.name}</Txt>
              {room.remaining !== null && (
                <Txt>
                  {text.remaining}: {room.remaining}
                </Txt>
              )}
              <Txt>
                {text.roomsNeeded}: {room.roomsNeeded}
              </Txt>
              {!room.isAvailable && (
                <Notice tone="warning">{room.reason ? text.reasons[room.reason] : text.unavailable}</Notice>
              )}
              {room.ratePlans.map((rate) => (
                <Card key={rate.code}>
                  <Txt variant="label">{rate.name}</Txt>
                  <Txt>{rate.isRefundable ? text.refundable : text.nonRefundable}</Txt>
                  {rate.pricePerNight !== null && (
                    <PriceRow label={text.perNight} amount={money(rate.pricePerNight)} />
                  )}
                  {rate.totalPrice !== null && (
                    <PriceRow label={text.total} amount={money(rate.totalPrice)} />
                  )}
                  <Button
                    disabled={
                      !valid ||
                      !isUnchanged ||
                      query.isFetching ||
                      !!query.error ||
                      !room.isAvailable ||
                      rate.totalPrice === null
                    }
                    onPress={() => {
                      setDraft({
                        hotelId: hotel.id,
                        hotelName: hotel.name,
                        roomName: room.name,
                        rateName: rate.name,
                        total: rate.totalPrice!,
                        request: {
                          adults: hotel.stay.adults,
                          sourcePostId: params.sourcePostId ?? null,
                          items: [
                            {
                              productId: room.productId,
                              checkIn: hotel.stay.checkIn,
                              checkOut: hotel.stay.checkOut,
                              qty: room.roomsNeeded,
                              ratePlanCode: rate.code,
                            },
                          ],
                        },
                      });
                      router.push('/cart');
                    }}
                  >
                    {text.choose}
                  </Button>
                </Card>
              ))}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
