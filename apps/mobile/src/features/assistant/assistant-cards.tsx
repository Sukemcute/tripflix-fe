import { feedApi, type AssistantAction, type AssistantCard } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors as c, radius, spacing as s } from '@tripflix/tokens';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, money, Txt, type IconName } from '@/components/mobile-ui';
import { compactType, mobileIconSize } from '@/components/mobile-scale';

const copy = vi.assistant;
type Reel = { poster: string };
// shortcut: core chưa có API lấy reel theo id bài; dò tối đa 5 trang feed (50 reel) như màn Reels.
const MAX_FEED_PAGES = 5;

/** Kết quả tìm kiếm không có ảnh bìa; lấy từ feed Reels, đồng thời biết video nào mở được trong Reels. */
function useFeedReels(postIds: string[]) {
  return useQuery({
    queryKey: ['assistant', 'reels', postIds],
    enabled: postIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const found: Record<string, Reel> = {};
      let cursor: string | undefined;
      for (let page = 0; page < MAX_FEED_PAGES; page++) {
        const result = await feedApi.list(cursor, signal);
        for (const item of result.items) {
          if (postIds.includes(item.postId)) found[item.postId] = { poster: item.video.posters.w360 };
        }
        cursor = result.nextCursor ?? undefined;
        if (!cursor || postIds.every((id) => found[id])) break;
      }
      return found;
    },
  });
}

/** Mở reel ở màn Reels (đủ nút tim, bình luận, khám phá); video ngoài feed thì mở trang bài viết. */
function openReel(card: AssistantCard, isInFeed: boolean, onOpen: () => void) {
  if (!isInFeed) return openCard(card, onOpen);
  onOpen();
  router.navigate({ pathname: '/(tabs)', params: { reel: card.id } });
}

function openCard(card: AssistantCard, onOpen: () => void) {
  onOpen();
  if (card.kind === 'stay') router.push({ pathname: '/hotel/[id]', params: { id: card.id } });
  else if (card.kind === 'flight') {
    // Màn chọn vé có sẵn tự tìm lại theo tuyến, ngày, số khách; giá và chỗ luôn lấy mới từ core.
    router.push({
      pathname: '/flights',
      params: {
        from: card.fromAirport ?? '',
        to: card.toAirport ?? '',
        date: card.flightDate ?? '',
        passengers: String(card.passengers ?? 1),
      },
    });
  } else router.push({ pathname: '/trip/[slug]', params: { slug: card.id } });
}

const ROW_ICONS: Record<string, IconName> = { stay: 'bed-outline', flight: 'airplane-outline' };

const INFO_KINDS = new Set(['weather', 'checklist', 'itinerary', 'summary', 'compare', 'transport']);
const INFO_ICONS: Record<string, IconName> = {
  weather: 'partly-sunny-outline',
  checklist: 'checkbox-outline',
  itinerary: 'map-outline',
  summary: 'chatbubbles-outline',
  compare: 'bed-outline',
  transport: 'bus-outline',
};

/** Nút của thẻ kế hoạch: chỉ có trên câu trả lời mới nhất, vì lựa chọn cũ không còn hiệu lực. */
type CardActions = { act: (label: string, action: AssistantAction) => void; canUndo: boolean };

/** Thẻ không có giá: các dòng do code dựng từ dữ liệu thật (dự báo, luật checklist, lộ trình của reel). */
function InfoCard({
  card,
  reel,
  onOpen,
  actions,
}: {
  card: AssistantCard;
  reel?: Reel;
  onOpen: () => void;
  actions?: CardActions;
}) {
  const isPlan = card.id.startsWith('plan:');
  return (
    <View style={styles.info}>
      <View style={styles.infoHeader}>
        <Icon name={INFO_ICONS[card.kind] ?? 'information-circle-outline'} size={mobileIconSize.control} color={c.tealInk} />
        <Txt variant="label" numberOfLines={2} style={[compactType.body, { flex: 1 }]}>
          {card.title}
        </Txt>
      </View>
      {card.lines?.map((line, index) => (
        <View key={`${card.ref}-${index}`} style={styles.line}>
          <Txt style={[compactType.meta, { flex: 1 }]}>
            <Txt variant="label" style={compactType.meta}>
              {line.label}
            </Txt>
            {line.detail ? ` · ${line.detail}` : ''}
          </Txt>
          {!!line.ref && actions && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${copy.choose}: ${line.label}`}
              onPress={() => actions.act(`${copy.choose} ${line.label}`, { type: 'select', ref: line.ref ?? '' })}
              style={styles.action}
            >
              <Txt variant="label" style={styles.actionText}>{copy.choose}</Txt>
            </Pressable>
          )}
        </View>
      ))}
      {!!card.source && (
        <Txt variant="caption" style={styles.source}>
          {copy.source}: {card.source}
        </Txt>
      )}
      {isPlan && actions?.canUndo && (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => actions.act(copy.undo, { type: 'undo' })}
            style={styles.action}
          >
            <Txt variant="label" style={styles.actionText}>{copy.undo}</Txt>
          </Pressable>
        </View>
      )}
      {card.kind === 'itinerary' && !isPlan && (
        <View style={styles.actions}>
          {reel && (
            <Pressable accessibilityRole="button" onPress={() => openReel(card, true, onOpen)} style={styles.action}>
              <Txt variant="label" style={styles.actionText}>{copy.watchReel}</Txt>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={() => openCard(card, onOpen)} style={styles.action}>
            <Txt variant="label" style={styles.actionText}>{copy.bookTrip}</Txt>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function VideoCard({ card, reel, onPlay }: { card: AssistantCard; reel?: Reel; onPlay: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${copy.watchVideo}: ${card.title}`}
      onPress={onPlay}
      style={({ pressed }) => [styles.video, pressed && { opacity: 0.85 }]}
    >
      {reel ? (
        <Image source={reel.poster} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.tealInk }]} />
      )}
      <View style={styles.play}>
        <Icon name="play" size={mobileIconSize.control} color={c.background} />
      </View>
      <View style={styles.videoCaption}>
        <Txt variant="caption" numberOfLines={3} style={styles.videoTitle}>
          {card.title}
        </Txt>
      </View>
    </Pressable>
  );
}

/** Thẻ Tripi tìm được: video thành hàng thẻ dọc như Reels (bấm để mở ở Reels), bài viết và nơi ở thành dòng bấm được. */
export function AssistantCards({
  cards,
  onOpen,
  actions,
}: {
  cards: AssistantCard[];
  onOpen: () => void;
  actions?: CardActions;
}) {
  const videos = cards.filter((card) => card.kind === 'video');
  const infos = cards.filter((card) => INFO_KINDS.has(card.kind));
  // Thẻ lạ (app cũ chưa biết) thì bỏ qua thay vì hiện dòng bấm vào trang sai.
  const others = cards.filter((card) => ['stay', 'flight', 'post', 'plan'].includes(card.kind));
  const reelIds = [...videos, ...infos.filter((card) => card.kind === 'itinerary')].map((card) => card.id);
  const reels = useFeedReels(reelIds).data ?? {};
  return (
    <View style={{ gap: s.sm }}>
      {videos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: s.sm }}>
          {videos.map((card) => (
            <VideoCard
              key={card.ref}
              card={card}
              reel={reels[card.id]}
              onPlay={() => openReel(card, Boolean(reels[card.id]), onOpen)}
            />
          ))}
        </ScrollView>
      )}
      {infos.map((card) => (
        <InfoCard key={card.ref} card={card} reel={reels[card.id]} onOpen={onOpen} actions={actions} />
      ))}
      {others.map((card) => (
        <Pressable
          key={card.ref}
          accessibilityRole="button"
          onPress={() => openCard(card, onOpen)}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
        >
          <Icon
            name={ROW_ICONS[card.kind] ?? 'map-outline'}
            size={mobileIconSize.control}
            color={c.tealInk}
          />
          <View style={{ flex: 1 }}>
            <Txt variant="label" numberOfLines={2} style={compactType.body}>
              {card.title}
            </Txt>
            {card.priceFrom !== null && (
              <Txt variant="caption" style={styles.price}>
                {copy.priceFrom} {money(card.priceFrom)}
              </Txt>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: 112,
    height: 168,
    overflow: 'hidden',
    borderRadius: radius.lg,
    justifyContent: 'flex-end',
  },
  play: {
    position: 'absolute',
    top: s.sm,
    right: s.sm,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.overlay,
  },
  videoCaption: { padding: s.sm, backgroundColor: c.overlayHeavy },
  videoTitle: { ...compactType.meta, color: c.background },
  price: { ...compactType.meta, color: c.coralInk },
  line: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
  info: { gap: s.xs, padding: s.sm, borderRadius: radius.md, backgroundColor: c.warmMist },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
  source: { ...compactType.meta, color: c.textMuted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm, paddingTop: s.xs },
  action: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: s.md,
    borderRadius: radius.pill,
    backgroundColor: c.background,
  },
  actionText: { ...compactType.label, color: c.tealInk },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    padding: s.sm,
    borderRadius: radius.md,
    backgroundColor: c.warmMist,
  },
});
