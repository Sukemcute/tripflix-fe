import { feedApi, type AssistantAction, type AssistantCard } from '@tripflix/api-client';
import {
  groupItineraryLines,
  parseWeatherLine,
  type DayPart,
  type ItineraryStop,
  type WeatherSky,
} from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { colors as c, nativeFonts as f, radius, spacing as s } from '@tripflix/tokens';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, money, Txt, type IconName } from '@/components/mobile-ui';
import { chatType } from './assistant-visuals';

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

const ROW_ICONS: Record<string, IconName> = {
  stay: 'bed-outline',
  flight: 'airplane-outline',
  post: 'newspaper-outline',
  plan: 'map-outline',
};

const INFO_KINDS = new Set([
  'weather',
  'checklist',
  'itinerary',
  'summary',
  'compare',
  'transport',
  'booking',
]);
const INFO_ICONS: Record<string, IconName> = {
  weather: 'partly-sunny-outline',
  checklist: 'checkbox-outline',
  itinerary: 'map-outline',
  summary: 'chatbubbles-outline',
  compare: 'git-compare-outline',
  transport: 'bus-outline',
};
const PART_ICONS: Record<DayPart, IconName> = {
  morning: 'sunny-outline',
  noon: 'sunny',
  afternoon: 'partly-sunny-outline',
  evening: 'moon-outline',
  night: 'moon',
};
const PART_TONES: Record<DayPart, { background: string; color: string }> = {
  morning: { background: c.sunSoft, color: c.navy },
  noon: { background: c.sunSoft, color: c.navy },
  afternoon: { background: c.coralTint, color: c.coralInk },
  evening: { background: c.seaMist, color: c.tealInk },
  night: { background: c.surfaceMuted, color: c.navy },
};
const SKY_ICONS: Record<WeatherSky, IconName> = {
  sunny: 'sunny-outline',
  cloudy: 'cloud-outline',
  rain: 'rainy-outline',
  storm: 'thunderstorm-outline',
  fog: 'cloudy-outline',
};

/** Nút của thẻ kế hoạch: chỉ có trên câu trả lời mới nhất, vì lựa chọn cũ không còn hiệu lực. */
type CardActions = { act: (label: string, action: AssistantAction) => void; canUndo: boolean };

function ServerActions({
  card,
  actions,
  onOpen,
}: {
  card: AssistantCard;
  actions?: CardActions;
  onOpen: () => void;
}) {
  const buttons = card.actions?.filter((action) => {
    if (action.type === 'book') return action.path === '/trip-builder';
    // Giữ nút Chọn theo dòng so sánh, không lặp lại action cùng ref ở chân thẻ.
    return (
      action.type === 'select' &&
      action.ref &&
      actions &&
      !(card.kind === 'compare' && card.lines?.some((line) => line.ref === action.ref))
    );
  });
  if (!buttons?.length) return null;
  return (
    <View style={styles.actions}>
      {buttons.map((action, index) => (
        <Button
          key={`${card.ref}-action-${index}`}
          compact
          onPress={() => {
            if (action.type === 'select' && action.ref) {
              actions?.act(action.label, { type: 'select', ref: action.ref });
            } else if (action.type === 'book' && action.path === '/trip-builder') {
              onOpen();
              router.push({ pathname: '/trip-builder', params: action.params ?? {} });
            }
          }}
        >
          {action.label}
        </Button>
      ))}
    </View>
  );
}

function CardHeader({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.cardIcon}>
        <Icon name={icon} size={20} color={c.coralInk} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt numberOfLines={2} style={styles.cardTitle}>
          {title}
        </Txt>
        {!!subtitle && <Txt style={styles.cardSubtitle}>{subtitle}</Txt>}
      </View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  isPrimary = false,
}: {
  label: string;
  onPress: () => void;
  isPrimary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, isPrimary && styles.actionPrimary, pressed && styles.pressed]}
    >
      <Txt style={[styles.actionText, isPrimary && styles.actionPrimaryText]}>{label}</Txt>
    </Pressable>
  );
}

function Source({ card }: { card: AssistantCard }) {
  return card.source ? (
    <Txt style={styles.source}>
      {copy.source}: {card.source}
    </Txt>
  ) : null;
}

function StopRow({ stop, isLast }: { stop: ItineraryStop; isLast: boolean }) {
  const tone = stop.part ? PART_TONES[stop.part] : null;
  const leg = [
    stop.distanceKm !== null ? t('assistant.legDistance', { km: stop.distanceKm }) : null,
    stop.minutes !== null ? t('assistant.legDuration', { minutes: stop.minutes }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={styles.stop}>
      <View style={styles.rail}>
        <View style={[styles.railDot, tone && { backgroundColor: tone.color }]} />
        {!isLast && <View style={styles.railLine} />}
      </View>
      <View style={[styles.stopBody, stop.service && styles.serviceStop]}>
        {stop.service && (
          <View style={styles.serviceBadge}>
            <Icon name={stop.service === 'flight' ? 'airplane-outline' : 'bed-outline'} size={13} color={c.coralInk} />
            <Txt style={styles.serviceText}>{copy.tripflixService}</Txt>
          </View>
        )}
        {!!stop.partLabel && (
          <View style={[styles.partBadge, tone && { backgroundColor: tone.background }]}>
            {stop.part && <Icon name={PART_ICONS[stop.part]} size={13} color={tone?.color ?? c.navy} />}
            <Txt style={[styles.partText, tone && { color: tone.color }]}>{stop.partLabel}</Txt>
          </View>
        )}
        <Txt style={styles.stopTitle}>{stop.title}</Txt>
        {!!stop.place && <Txt style={styles.stopMeta}>{stop.place}</Txt>}
        {!!leg && (
          <View style={styles.leg}>
            <Icon name="car-outline" size={13} color={c.textMuted} />
            <Txt style={styles.stopMeta}>{leg}</Txt>
          </View>
        )}
      </View>
    </View>
  );
}

/** Lộ trình dạng timeline theo ngày (SCRUM-167): ngày → mốc có buổi, tên điểm, quãng đường. */
function ItineraryCard({
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
  const days = groupItineraryLines(card.lines ?? []);
  const stopCount = days.reduce((total, day) => total + day.stops.length, 0);
  const dayCount = days.filter((day) => day.day !== null).length;
  const subtitle = dayCount
    ? t('assistant.itinerarySummary', { days: dayCount, stops: stopCount })
    : t('assistant.itineraryStops', { stops: stopCount });
  return (
    <View style={styles.card}>
      <CardHeader icon="map-outline" title={card.title} subtitle={subtitle} />
      {days.map((day, dayIndex) => (
        <View key={`${card.ref}-day-${dayIndex}`} style={styles.day}>
          <View style={styles.dayHead}>
            <Txt style={styles.dayChip}>
              {day.day !== null ? t('assistant.dayLabel', { day: day.day }) : copy.otherStops}
            </Txt>
            <View style={styles.dayRule} />
          </View>
          {day.stops.map((stop, index) => (
            <StopRow
              key={`${card.ref}-${dayIndex}-${index}`}
              stop={stop}
              isLast={index === day.stops.length - 1}
            />
          ))}
        </View>
      ))}
      <Source card={card} />
      {isPlan && actions?.canUndo && (
        <View style={styles.actions}>
          <ActionButton label={copy.undo} onPress={() => actions.act(copy.undo, { type: 'undo' })} />
        </View>
      )}
      {!isPlan && (
        <View style={styles.actions}>
          {reel && <ActionButton label={copy.watchReel} onPress={() => openReel(card, true, onOpen)} />}
          <ActionButton isPrimary label={copy.bookTrip} onPress={() => openCard(card, onOpen)} />
        </View>
      )}
    </View>
  );
}

function WeatherCard({ card }: { card: AssistantCard }) {
  return (
    <View style={styles.card}>
      <CardHeader icon="partly-sunny-outline" title={card.title} />
      {card.lines?.map((line, index) => {
        const weather = parseWeatherLine(line.detail);
        return (
          <View key={`${card.ref}-${index}`} style={[styles.weatherRow, index > 0 && styles.divider]}>
            <View style={styles.weatherIcon}>
              <Icon name={SKY_ICONS[weather.skyKind]} size={22} color={c.tealInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={styles.weatherDay}>{line.label}</Txt>
              <Txt style={styles.stopMeta}>{weather.sky ?? line.detail}</Txt>
            </View>
            <View style={styles.weatherRight}>
              {weather.minC !== null && weather.maxC !== null && (
                <Txt style={styles.temperature}>
                  {t('assistant.temperatureRange', { min: weather.minC, max: weather.maxC })}
                </Txt>
              )}
              {weather.rainChance !== null && (
                <View style={styles.rainChip}>
                  <Icon name="water-outline" size={12} color={c.tealInk} />
                  <Txt style={styles.rainText}>
                    {t('assistant.rainChance', { percent: weather.rainChance })}
                  </Txt>
                </View>
              )}
            </View>
          </View>
        );
      })}
      <Source card={card} />
    </View>
  );
}

/** Checklist, so sánh, tóm tắt, di chuyển: danh sách dòng gọn, dòng so sánh có nút Chọn. */
function ListCard({ card, actions }: { card: AssistantCard; actions?: CardActions }) {
  const isChecklist = card.kind === 'checklist';
  const isPlan = card.id.startsWith('plan:');
  return (
    <View style={styles.card}>
      <CardHeader icon={INFO_ICONS[card.kind] ?? 'information-circle-outline'} title={card.title} />
      {card.lines?.map((line, index) => (
        <View key={`${card.ref}-${index}`} style={[styles.listRow, index > 0 && styles.divider]}>
          {isChecklist && (
            <View style={styles.check}>
              <Icon name="checkmark" size={14} color={c.background} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Txt style={styles.listLabel}>{line.label}</Txt>
            {!!line.detail && <Txt style={styles.stopMeta}>{line.detail}</Txt>}
          </View>
          {!!line.ref && actions && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${copy.choose}: ${line.label}`}
              onPress={() =>
                actions.act(`${copy.choose} ${line.label}`, { type: 'select', ref: line.ref ?? '' })
              }
              style={({ pressed }) => [styles.action, styles.actionPrimary, pressed && styles.pressed]}
            >
              <Txt style={[styles.actionText, styles.actionPrimaryText]}>{copy.choose}</Txt>
            </Pressable>
          )}
        </View>
      ))}
      <Source card={card} />
      {isPlan && actions?.canUndo && (
        <View style={styles.actions}>
          <ActionButton label={copy.undo} onPress={() => actions.act(copy.undo, { type: 'undo' })} />
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
      style={({ pressed }) => [styles.video, pressed && styles.pressed]}
    >
      {reel ? (
        <Image source={reel.poster} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.tealInk }]} />
      )}
      <View style={styles.play}>
        <Icon name="play" size={16} color={c.background} />
      </View>
      <View style={styles.videoCaption}>
        <Txt numberOfLines={3} style={styles.videoTitle}>
          {card.title}
        </Txt>
      </View>
    </Pressable>
  );
}

function infoCard(
  card: AssistantCard,
  reel: Reel | undefined,
  onOpen: () => void,
  actions?: CardActions,
): ReactNode {
  if (card.kind === 'itinerary')
    return <ItineraryCard card={card} reel={reel} onOpen={onOpen} actions={actions} />;
  if (card.kind === 'weather') return <WeatherCard card={card} />;
  return <ListCard card={card} actions={actions} />;
}

/** Thẻ Tripi tìm được: video thành hàng thẻ dọc như Reels; lộ trình, thời tiết, danh sách và phòng/vé là khối riêng có CTA. */
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
    <View style={{ gap: s.md }}>
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
        <Fragment key={card.ref}>
          {infoCard(card, reels[card.id], onOpen, actions)}
          <ServerActions card={card} actions={actions} onOpen={onOpen} />
        </Fragment>
      ))}
      {others.map((card) => (
        <Fragment key={card.ref}>
          <Pressable
            accessibilityRole="button"
            onPress={() => openCard(card, onOpen)}
            style={({ pressed }) => [styles.card, styles.row, pressed && styles.pressed]}
          >
            <View style={styles.cardIcon}>
              <Icon name={ROW_ICONS[card.kind] ?? 'map-outline'} size={20} color={c.coralInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt numberOfLines={2} style={styles.listLabel}>
                {card.title}
              </Txt>
              {card.priceFrom !== null && (
                <Txt style={styles.price}>
                  {copy.priceFrom} {money(card.priceFrom)}
                </Txt>
              )}
            </View>
            <Icon name="chevron-forward" size={18} color={c.textMuted} />
          </Pressable>
          <ServerActions card={card} actions={actions} onOpen={onOpen} />
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: s.md,
    padding: s.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    boxShadow: `0 6px 18px -12px ${c.overlay}`,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: s.md },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.coralTint,
  },
  cardTitle: { ...chatType.title, fontFamily: f.bold, color: c.navy },
  cardSubtitle: { ...chatType.meta, fontFamily: f.medium, color: c.textMuted },
  day: { gap: s.sm },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
  dayChip: {
    ...chatType.meta,
    fontFamily: f.bold,
    color: c.background,
    backgroundColor: c.navy,
    paddingHorizontal: s.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  dayRule: { flex: 1, height: 1, backgroundColor: c.border },
  stop: { flexDirection: 'row', gap: s.md },
  rail: { width: 14, alignItems: 'center', paddingTop: 6 },
  railDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.coral,
    borderWidth: 2,
    borderColor: c.background,
    boxShadow: `0 0 0 2px ${c.border}`,
  },
  // Nét đứt nối các mốc trong ngày; nền viền thường quá nhạt, không thấy được đường đi.
  railLine: {
    flex: 1,
    width: 0,
    marginTop: 4,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    borderColor: c.coralSoft,
  },
  stopBody: { flex: 1, gap: 3, paddingBottom: s.md },
  // Chuyến bay, khách sạn Tripflix trong lộ trình: nổi bật để khách thấy phần đặt được.
  serviceStop: {
    padding: s.sm,
    marginBottom: s.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.coral,
    backgroundColor: c.coralTint,
  },
  serviceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  serviceText: { ...chatType.meta, fontFamily: f.semibold, color: c.coralInk },
  partBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: s.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceMuted,
  },
  partText: { ...chatType.meta, fontFamily: f.semibold, color: c.navy },
  stopTitle: { ...chatType.body, fontFamily: f.semibold, color: c.ink },
  stopMeta: { ...chatType.meta, color: c.textMuted },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  source: { ...chatType.meta, color: c.textMuted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
  action: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: s.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  actionPrimary: { borderColor: c.coral, backgroundColor: c.coral },
  actionText: { ...chatType.small, fontFamily: f.semibold, color: c.navy },
  actionPrimaryText: { color: c.background },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: s.md },
  divider: { paddingTop: s.md, borderTopWidth: 1, borderTopColor: c.border },
  weatherIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.seaMist,
  },
  weatherDay: { ...chatType.body, fontFamily: f.semibold, color: c.ink },
  weatherRight: { alignItems: 'flex-end', gap: 4 },
  temperature: { ...chatType.title, fontFamily: f.bold, color: c.navy },
  rainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: c.seaMist,
  },
  rainText: { ...chatType.meta, fontFamily: f.semibold, color: c.tealInk },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: s.md },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.teal,
  },
  listLabel: { ...chatType.body, fontFamily: f.semibold, color: c.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: s.md, padding: s.md },
  price: { ...chatType.small, fontFamily: f.semibold, color: c.coralInk },
  video: {
    width: 120,
    height: 180,
    overflow: 'hidden',
    borderRadius: 18,
    justifyContent: 'flex-end',
  },
  play: {
    position: 'absolute',
    top: s.sm,
    right: s.sm,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.overlay,
  },
  videoCaption: { padding: s.sm, backgroundColor: c.overlayHeavy },
  videoTitle: { ...chatType.meta, fontFamily: f.semibold, color: c.background },
});
