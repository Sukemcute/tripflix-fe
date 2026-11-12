import { feedApi, type AssistantCard } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { colors as c, radius, spacing as s } from '@tripflix/tokens';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, money, Txt } from '@/components/mobile-ui';
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
  else router.push({ pathname: '/trip/[slug]', params: { slug: card.id } });
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
export function AssistantCards({ cards, onOpen }: { cards: AssistantCard[]; onOpen: () => void }) {
  const videos = cards.filter((card) => card.kind === 'video');
  const others = cards.filter((card) => card.kind !== 'video');
  const reels = useFeedReels(videos.map((card) => card.id)).data ?? {};
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
      {others.map((card) => (
        <Pressable
          key={card.ref}
          accessibilityRole="button"
          onPress={() => openCard(card, onOpen)}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
        >
          <Icon
            name={card.kind === 'stay' ? 'bed-outline' : 'map-outline'}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    padding: s.sm,
    borderRadius: radius.md,
    backgroundColor: c.warmMist,
  },
});
