import { useMutation, useQuery } from '@tanstack/react-query';
import {
  commerceApi,
  getFutureDate,
  useApiSession,
  type AssistantAction,
  type AssistantTrip,
} from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors, nativeFonts, radius, spacing } from '@tripflix/tokens';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { LoadingDots } from '@/components/loading-dots';
import { compactType, mobileIconSize } from '@/components/mobile-scale';
import { Badge, Button, formatDate, Icon, money, Row, Txt, ui } from '@/components/mobile-ui';
import { AssistantCards } from '@/features/assistant/assistant-cards';
import type { AssistantMessage } from '@/features/assistant/assistant-provider';
import { askTripiTurn, newTripiConversationId } from '@/features/assistant/assistant-transport';
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
        <Txt variant="title" style={layout.sectionTitle}>
          {copy.upcomingTitle}
        </Txt>
        <Button tone="text" icon="arrow-forward" onPress={() => router.push('/my-trips')}>
          {copy.upcomingAll}
        </Button>
      </Row>
      {query.isPending && <LoadingDots />}
      {!query.isPending && trips.length === 0 && (
        <View style={layout.empty}>
          <View style={layout.tripIcon}>
            <Icon name="airplane-outline" size={22} color={colors.tealInk} />
          </View>
          <Txt style={[layout.bodyText, ui.flex]}>{copy.upcomingEmpty}</Txt>
        </View>
      )}
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

/** Cuộc trò chuyện của ô lên lộ trình, sống hết phiên dùng app (ô bị gỡ khi đang xem lộ trình hay thanh toán). */
let savedChat: {
  text: string;
  conversationId: string;
  messages: AssistantMessage[];
  trip: AssistantTrip | null;
} = { text: '', conversationId: newTripiConversationId(), messages: [], trip: null };

/**
 * Ô lên lộ trình nhanh: hỏi Tripi rồi hiện thẻ ngay bên dưới, không mở khung chat. Bấm Chọn trên thẻ khách sạn,
 * chuyến bay gửi tiếp trong cùng cuộc trò chuyện để Tripi ra lộ trình từng ngày; nút Đặt trên lộ trình đưa về màn
 * Đặt theo lộ trình của tab này.
 */
export function AskTripiCard() {
  // Khởi tạo từ bản giữ ngoài component: bấm Đặt sang màn lộ trình, thanh toán rồi quay lại vẫn còn cuộc trò chuyện.
  const [text, setText] = useState(savedChat.text);
  const [conversationId, setConversationId] = useState(savedChat.conversationId);
  const [messages, setMessages] = useState<AssistantMessage[]>(savedChat.messages);
  const [trip, setTrip] = useState<AssistantTrip | null>(savedChat.trip);
  useEffect(() => {
    savedChat = { text, conversationId, messages, trip };
  }, [text, conversationId, messages, trip]);
  const turn = useMutation({
    retry: false,
    mutationFn: ({ message, action }: { message: string; action?: AssistantAction }) =>
      askTripiTurn({ conversationId, message, history: messages, action, trip }),
    onSuccess: (reply, { message }) => {
      if (reply.trip !== undefined) setTrip(reply.trip ?? null);
      setMessages((current) => [
        ...current,
        { id: `u${current.length}`, role: 'user', text: message },
        { id: `a${current.length}`, role: 'assistant', ...reply },
      ]);
    },
  });
  const reset = () => {
    setConversationId(newTripiConversationId());
    setMessages([]);
    setTrip(null);
    turn.reset();
  };
  const ask = () => {
    const request = text.trim();
    if (!request || turn.isPending) return;
    // Câu đầu nói rõ cần lộ trình để Tripi không chỉ gợi ý reel; câu sau là trả lời tiếp trong cuộc trò chuyện.
    turn.mutate({ message: messages.length ? request : copy.askTripiPrefix + request });
    setText('');
  };
  const latest = messages.at(-1);
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
          editable={!turn.isPending}
          accessibilityLabel={copy.askTripiTitle}
          style={layout.askInput}
        />
        <Button icon="sparkles-outline" disabled={!text.trim() || turn.isPending} onPress={ask}>
          {copy.askTripiSend}
        </Button>
        {messages.length > 0 && (
          <Button tone="text" icon="refresh" disabled={turn.isPending} onPress={reset}>
            {copy.askTripiAgain}
          </Button>
        )}
      </View>
      {turn.isPending && <LoadingDots />}
      {turn.isError && <Txt style={styles.muted}>{vi.assistant.error}</Txt>}
      {latest && !turn.isPending && (
        <>
          {/* Tripi hỏi lại hoặc từ chối thì khách trả lời ngay ở ô trên. */}
          {!!latest.text && (
            <Row style={layout.reply}>
              <Icon name="sparkles" size={18} color={colors.coralInk} />
              <Txt style={[layout.bodyText, ui.flex]}>{latest.text}</Txt>
            </Row>
          )}
          {!!latest.cards?.length && (
            <AssistantCards
              cards={latest.cards}
              onOpen={() => undefined}
              actions={{
                act: (label, action) => turn.mutate({ message: label, action }),
                canUndo: messages.length > 2,
                trip,
              }}
            />
          )}
        </>
      )}
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
  sectionTitle: { flex: 1 },
  bodyText: { ...compactType.body, fontFamily: nativeFonts.regular, color: colors.ink, lineHeight: 22 },
  // Nét đứt, nền trong suốt: chỉ là thông báo, không nhầm với thẻ bấm được bên dưới.
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  // Câu trả lời của Tripi nằm trong khung riêng, thụt vào như các thẻ bên dưới.
  reply: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
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
