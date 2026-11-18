import { useMutation, useQuery } from '@tanstack/react-query';
import { commerceApi, getFutureDate, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { LoadingDots } from '@/components/loading-dots';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { Badge, Button, formatDate, Icon, money, Row, Txt, ui } from '@/components/mobile-ui';
import { AssistantCards } from '@/features/assistant/assistant-cards';
import { askTripiOnce } from '@/features/assistant/assistant-transport';
import { styles } from './trip-plan-parts';

const copy = vi.mobile.tripPlan;
const UPCOMING_LIMIT = 3;

/** Đơn đã đặt chưa đi xong (đang giữ chỗ, đang trả hoặc đã trả mà chưa tới ngày về), mới nhất trước. */
export function UpcomingTrips() {
  const { user, isReady } = useApiSession();
  const query = useQuery({
    queryKey: ['commerce', 'trips', 'upcoming', user?.id],
    enabled: isReady && !!user,
    staleTime: 60_000,
    queryFn: ({ signal }) => commerceApi.listTrips(undefined, signal),
  });
  // Khách chưa đăng nhập thì không có chuyến để hiện.
  if (!user) return null;
  const today = getFutureDate(0);
  const trips = (query.data?.trips ?? [])
    .filter(
      (trip) =>
        trip.status !== 'cancelled' &&
        trip.status !== 'expired' &&
        (!trip.endDate || trip.endDate.slice(0, 10) >= today),
    )
    .slice(0, UPCOMING_LIMIT);
  return (
    <View style={{ gap: spacing.sm }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="heading">{copy.upcomingTitle}</Txt>
        <Button tone="text" icon="arrow-forward" onPress={() => router.push('/my-trips')}>
          {copy.upcomingAll}
        </Button>
      </Row>
      {query.isPending && <LoadingDots />}
      {!query.isPending && trips.length === 0 && <Txt style={styles.muted}>{copy.upcomingEmpty}</Txt>}
      {trips.map((trip) => (
        <Pressable
          key={trip.orderId}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/booking/[id]', params: { id: trip.orderId } })}
          style={({ pressed }) => [layout.trip, pressed && styles.pressed]}
        >
          <View style={layout.tripIcon}>
            <Icon name="calendar-outline" size={20} color={colors.tealInk} />
          </View>
          <View style={ui.flex}>
            <Txt style={layout.tripTitle} numberOfLines={2}>
              {trip.items.map((item) => item.productName).join(' · ')}
            </Txt>
            {trip.startDate && (
              <Txt style={styles.muted}>
                {formatDate(trip.startDate.slice(0, 10))}
                {trip.endDate ? ` → ${formatDate(trip.endDate.slice(0, 10))}` : ''} · {money(trip.total)}
              </Txt>
            )}
          </View>
          <Badge tone={trip.status === 'paid' ? 'teal' : 'sun'}>{vi.commerce.status[trip.status]}</Badge>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Ô lên lộ trình nhanh: hỏi Tripi một lượt rồi hiện lịch từng ngày ngay bên dưới, không mở khung chat.
 * Nút Đặt trên thẻ lịch đưa lộ trình vào màn Đặt theo lộ trình của tab này.
 */
export function AskTripiCard() {
  const [text, setText] = useState('');
  const plan = useMutation({
    retry: false,
    mutationFn: (message: string) => askTripiOnce(message),
  });
  const ask = () => {
    const message = text.trim();
    if (!message || plan.isPending) return;
    plan.mutate(message);
  };
  const reply = plan.data;
  const cards = reply?.cards ?? [];
  return (
    <View style={{ gap: spacing.md }}>
      <View style={layout.ask}>
        <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
          <Icon name="sparkles" size={mobileIconSize.control} color={colors.coralInk} />
          <Txt variant="heading" style={ui.flex}>
            {copy.askTripiTitle}
          </Txt>
        </Row>
        <Txt style={styles.muted}>{copy.askTripiBody}</Txt>
        <TextInput
          value={text}
          onChangeText={setText}
          maxLength={200}
          placeholder={copy.askTripiPlaceholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType="send"
          onSubmitEditing={ask}
          editable={!plan.isPending}
          accessibilityLabel={copy.askTripiTitle}
          style={layout.askInput}
        />
        <Button icon="sparkles-outline" disabled={!text.trim() || plan.isPending} onPress={ask}>
          {copy.askTripiSend}
        </Button>
      </View>
      {plan.isPending && <LoadingDots />}
      {plan.isError && <Txt style={styles.muted}>{vi.assistant.error}</Txt>}
      {/* Tripi hỏi lại hoặc từ chối thì hiện câu trả lời để khách sửa yêu cầu rồi hỏi tiếp. */}
      {!!reply?.text && !plan.isPending && <Txt>{reply.text}</Txt>}
      {cards.length > 0 && !plan.isPending && <AssistantCards cards={cards} onOpen={() => undefined} />}
    </View>
  );
}

const layout = StyleSheet.create({
  trip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  tripIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.seaMist,
  },
  tripTitle: { ...compactType.body, fontFamily: nativeFonts.semibold, color: colors.ink },
  ask: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.coralTint,
  },
  askInput: {
    ...compactType.body,
    fontFamily: nativeFonts.regular,
    color: colors.ink,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
});
