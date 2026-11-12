import { useMutation, useQuery } from '@tanstack/react-query';
import { buildTripPlanCheckout, getTripDayDate, getTripNights, pickCheapestOffer } from '@tripflix/app-core';
import { commerceApi, createCheckoutOperation, getFutureDate, useApiSession } from '@tripflix/api-client';
import type { TripAttachmentDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { colors, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiErrorNotice } from '@/components/api-state';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button, Field, Icon, IconButton, money, Notice, Row, Txt } from '@/components/mobile-ui';
import { useAssistant } from '@/features/assistant/assistant-provider';

const copy = vi.mobile.tripPlan;
const MAX_ADULTS = 9;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Lộ trình người đăng chia sẻ: lịch từng ngày, giá phòng thật của khách sạn trong lộ trình theo ngày khởi hành
 * người xem chọn, và nút "Đặt ngay" giữ phòng rồi sang thanh toán.
 */
export function TripPlanSheet({
  visible,
  onClose,
  postId,
  postTitle,
  authorName,
  trip,
}: {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  authorName: string;
  trip: TripAttachmentDto;
}) {
  const { isReady, user } = useApiSession();
  const assistant = useAssistant();
  const [startDate, setStartDate] = useState(() => getFutureDate(14));
  const [adults, setAdults] = useState(2);
  const isDateValid = DATE_PATTERN.test(startDate);
  const items = trip.items ?? [];
  const days = Math.max(trip.daysCount ?? 0, ...items.map((item) => item.day), 1);
  const nights = getTripNights(days);
  const hotelId = trip.hotelId;
  const checkIn = isDateValid ? startDate : '';
  const checkOut = isDateValid ? getTripDayDate(startDate, nights + 1) : '';

  const room = useQuery({
    queryKey: ['commerce', 'trip-plan-room', hotelId, checkIn, checkOut, adults],
    enabled: visible && isReady && !!hotelId && isDateValid,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const hotel = await commerceApi.getHotel(hotelId!, { checkIn, checkOut, adults }, signal);
      const offer = pickCheapestOffer(
        hotel.rooms.map((offerRoom) => ({
          productId: offerRoom.productId,
          isAvailable: offerRoom.isAvailable,
          plans: offerRoom.ratePlans.map((plan) => ({ code: plan.code, totalPrice: plan.totalPrice })),
        })),
      );
      return { hotelName: hotel.name, offer };
    },
  });
  const offer = room.data?.offer ?? null;

  const [createCheckout] = useState(createCheckoutOperation);
  const booking = useMutation({
    retry: false,
    mutationFn: () => {
      if (!offer) throw new Error('No room to book');
      return createCheckout(
        buildTripPlanCheckout({
          adults,
          sourcePostId: postId,
          flights: [],
          rooms: [{ productId: offer.productId, ratePlanCode: offer.ratePlanCode, checkIn, checkOut }],
        }),
      );
    },
    onSuccess: ({ orderId }) => {
      onClose();
      router.push({ pathname: '/checkout', params: { id: orderId } });
    },
  });
  const book = () => {
    if (!user) {
      onClose();
      router.push({ pathname: '/login', params: { returnTo: '/(tabs)' } });
      return;
    }
    booking.mutate();
  };
  const askTripi = () => {
    onClose();
    assistant.setDraft(t('mobile.tripPlan.askTripiPrompt', { title: postTitle, date: startDate, adults }));
    assistant.setIsOpen(true);
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('mobile.tripPlan.title', { days, destination: trip.destinationName ?? postTitle })}
      onClose={onClose}
      footer={
        <View style={styles.footer}>
          {!!hotelId && (
            <View style={styles.totalRow}>
              <Txt variant="caption" style={styles.muted}>
                {copy.total}
              </Txt>
              <Txt variant="heading">{offer ? money(offer.totalPrice) : room.isFetching ? '…' : '—'}</Txt>
            </View>
          )}
          <Row style={styles.actions}>
            <Button tone="secondary" icon="sparkles-outline" onPress={askTripi}>
              {copy.askTripi}
            </Button>
            {!!hotelId && (
              <Button disabled={!offer || booking.isPending} onPress={book}>
                {booking.isPending ? copy.booking : copy.bookNow}
              </Button>
            )}
          </Row>
        </View>
      }
    >
      <Txt variant="caption" style={styles.muted}>
        {t('mobile.tripPlan.by', { name: authorName })}
      </Txt>
      {hotelId ? (
        <View style={styles.controls}>
          <Field
            label={copy.startDate}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            maxLength={10}
          />
          <View style={styles.stepper}>
            <Txt variant="label">{copy.adults}</Txt>
            <Row style={styles.stepperRow}>
              <IconButton
                name="remove"
                label="-"
                onPress={() => setAdults((value) => Math.max(1, value - 1))}
              />
              <Txt variant="label">{adults}</Txt>
              <IconButton
                name="add"
                label="+"
                onPress={() => setAdults((value) => Math.min(MAX_ADULTS, value + 1))}
              />
            </Row>
          </View>
          <View style={styles.line}>
            <Icon name="bed-outline" size={18} color={colors.tealInk} />
            <Txt style={styles.lineBody}>
              {t('mobile.tripPlan.stay', { hotel: room.data?.hotelName ?? trip.hotelName ?? '', nights })}
            </Txt>
          </View>
          {room.isFetching && <Txt style={styles.muted}>{copy.checking}</Txt>}
          {room.isSuccess && !offer && <Notice tone="warning">{copy.soldOut}</Notice>}
        </View>
      ) : (
        <Notice>{copy.nothingToBook}</Notice>
      )}
      <ApiErrorNotice error={room.error ?? booking.error} />
      {Array.from({ length: days }, (_, index) => index + 1).map((day) => (
        <View key={day} style={styles.day}>
          <Txt variant="label">{t('mobile.tripPlan.day', { day })}</Txt>
          {items
            .filter((item) => item.day === day)
            .map((item, index) => (
              <View key={index} style={styles.line}>
                <Icon name="location-outline" size={18} color={colors.coral} />
                <View style={styles.lineBody}>
                  <Txt>{item.title}</Txt>
                  {!!(item.location || item.notes) && (
                    <Txt variant="caption" style={styles.muted}>
                      {[item.location, item.notes].filter(Boolean).join(' · ')}
                    </Txt>
                  )}
                </View>
              </View>
            ))}
        </View>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted },
  controls: { gap: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperRow: { alignItems: 'center', gap: spacing.sm },
  day: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  lineBody: { flex: 1, gap: spacing.xs },
  footer: { gap: spacing.sm },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { gap: spacing.sm, justifyContent: 'flex-end' },
});
