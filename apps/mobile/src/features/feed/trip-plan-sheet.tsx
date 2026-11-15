import { getBookableTripPlan, getTripNights } from '@tripflix/app-core';
import type { TripAttachmentDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { colors } from '@tripflix/tokens';
import { router } from 'expo-router';
import { View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button, Icon, Row, Txt } from '@/components/mobile-ui';
import { useAssistant } from '@/features/assistant/assistant-provider';
import { saveTripBooking } from '@/features/booking/trip-booking-store';
import { ProductCard, styles } from '@/features/booking/trip-plan-parts';

const copy = vi.mobile.tripPlan;

/** Xem lịch trình cộng đồng; việc chọn dịch vụ và lấy giá nằm ở tab Đặt. */
export function TripPlanSheet({
  visible,
  onClose,
  postId,
  postTitle,
  authorName,
  coverUrl,
  trip,
}: {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  authorName: string;
  coverUrl?: string;
  trip: TripAttachmentDto;
}) {
  const assistant = useAssistant();
  const items = trip.items ?? [];
  const days = Math.max(trip.daysCount ?? 0, ...items.map((item) => item.day), 1);
  const nights = getTripNights(days);
  const plan = getBookableTripPlan(trip);
  const askTripi = () => {
    onClose();
    assistant.setDraft(t('mobile.tripPlan.askTripiViewPrompt', { title: postTitle }));
    assistant.openDialog();
  };
  const book = () => {
    saveTripBooking({ postId, postTitle, authorName, coverUrl, trip });
    onClose();
    router.navigate('/(tabs)/book');
  };
  return (
    <BottomSheet
      visible={visible}
      compact
      title={trip.destinationName ?? postTitle}
      onClose={onClose}
      footer={
        <Row style={styles.actions}>
          <Button compact tone="secondary" icon="sparkles-outline" onPress={askTripi}>
            {copy.askTripi}
          </Button>
          {plan && (
            <Button compact icon="bag-handle-outline" onPress={book}>
              {copy.bookTrip}
            </Button>
          )}
        </Row>
      }
    >
      <View style={styles.hero}>
        <Row style={styles.heroChips}>
          <View style={styles.heroChip}>
            <Icon name="calendar-outline" size={12} color={colors.tealInk} />
            <Txt style={styles.heroChipText}>{t('mobile.tripPlan.daysNights', { days, nights })}</Txt>
          </View>
        </Row>
        <Txt style={styles.muted}>{t('mobile.tripPlan.by', { name: authorName })}</Txt>
      </View>
      <View style={styles.timeline}>
        {Array.from({ length: days }, (_, index) => index + 1).map((day) => {
          const flightLegs = (plan?.flights ?? []).filter((leg) => leg.day === day);
          const community = items.filter((item) => item.day === day && !item.transport);
          const selfArranged =
            plan?.selfArranged.filter((leg) => leg.day === day) ??
            items
              .filter((item) => item.day === day && !!item.transport)
              .map((item) => ({ title: item.title, mode: item.transport!.mode }));
          return (
            <View key={day} style={styles.day}>
              {day < days && <View style={styles.rail} />}
              <View style={styles.dayDot} />
              <View style={styles.dayContent}>
                <Txt style={styles.dayLabel}>{t('mobile.tripPlan.day', { day })}</Txt>
                {flightLegs.map((leg, index) => (
                  <ProductCard
                    key={index}
                    tone="flight"
                    icon="airplane"
                    title={`${leg.from} → ${leg.to}`}
                    detail={copy.flightTitle}
                  />
                ))}
                {day === 1 && plan?.hotelId && (
                  <ProductCard
                    tone="hotel"
                    icon="bed"
                    title={trip.hotelName ?? copy.stayTitle}
                    detail={t('mobile.tripPlan.hotelTitle', { nights })}
                  />
                )}
                {selfArranged.map((leg, index) => (
                  <View key={'self' + index} style={styles.stop}>
                    <Icon name="bus-outline" size={14} color={colors.textMuted} />
                    <Txt style={styles.muted}>
                      {[leg.title || copy.modes[leg.mode], copy.selfArranged].join(' · ')}
                    </Txt>
                  </View>
                ))}
                {community.length > 0 && (
                  <View style={styles.community}>
                    <Txt style={styles.communityLabel}>{copy.community}</Txt>
                    {community.map((item, index) => (
                      <View key={index} style={styles.stop}>
                        <Icon name="location-outline" size={14} color={colors.textMuted} />
                        <View style={styles.stopText}>
                          <Txt style={styles.description}>{item.title}</Txt>
                          {!!(item.location || item.notes) && (
                            <Txt style={styles.muted}>
                              {[item.location, item.notes].filter(Boolean).join(' · ')}
                            </Txt>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
}
