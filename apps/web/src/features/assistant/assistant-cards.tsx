'use client';

import { feedApi, type AssistantAction, type AssistantCard } from '@tripflix/api-client';
import {
  groupItineraryLines,
  parseWeatherLine,
  type DayPart,
  type ItineraryStop,
  type WeatherSky,
} from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import { formatVnd } from '@tripflix/utils';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getAssistantBookingLinks, getAssistantCardHref } from './assistant-card-href';
import { AssistantIcon, type AssistantIconName } from './assistant-icon';
import styles from './assistant.module.css';

const copy = vi.assistant;
type Reel = { poster: string };
// shortcut: core chưa có API lấy reel theo id bài; dò tối đa 5 trang feed (50 reel) như app.
const MAX_FEED_PAGES = 5;

/** Kết quả tìm kiếm không có ảnh bìa; lấy từ feed Reels, đồng thời biết video nào mở được dạng reel. */
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

const ROW_ICONS: Record<string, AssistantIconName> = { stay: 'bed', flight: 'plane', post: 'news', plan: 'map' };
const INFO_KINDS = new Set([
  'weather',
  'checklist',
  'itinerary',
  'summary',
  'compare',
  'transport',
  'booking',
]);
const INFO_ICONS: Record<string, AssistantIconName> = {
  weather: 'sun',
  checklist: 'checklist',
  itinerary: 'map',
  summary: 'chat',
  compare: 'compare',
  transport: 'bus',
};
const PART_ICONS: Record<DayPart, AssistantIconName> = {
  morning: 'sun',
  noon: 'sun',
  afternoon: 'sun',
  evening: 'moon',
  night: 'moon',
};
const SKY_ICONS: Record<WeatherSky, AssistantIconName> = {
  sunny: 'sun',
  cloudy: 'cloud',
  rain: 'rain',
  storm: 'storm',
  fog: 'cloud',
};

/** Nút của thẻ kế hoạch: chỉ có trên câu trả lời mới nhất, vì lựa chọn cũ không còn hiệu lực. */
export type CardActions = { act: (label: string, action: AssistantAction) => void; canUndo: boolean };

function CardHeader({ icon, title, subtitle }: { icon: AssistantIconName; title: string; subtitle?: string }) {
  return (
    <div className={styles.cardHeader}>
      <span className={styles.cardIcon}>
        <AssistantIcon name={icon} />
      </span>
      <div>
        <p className={styles.cardTitle}>{title}</p>
        {!!subtitle && <p className={styles.meta}>{subtitle}</p>}
      </div>
    </div>
  );
}

function Source({ card }: { card: AssistantCard }) {
  return card.source ? (
    <p className={styles.meta}>
      {copy.source}: {card.source}
    </p>
  ) : null;
}

function UndoButton({ card, actions }: { card: AssistantCard; actions?: CardActions }) {
  if (!card.id.startsWith('plan:') || !actions?.canUndo) return null;
  return (
    <div className={styles.cardActions}>
      <button type="button" className={styles.cardAction} onClick={() => actions.act(copy.undo, { type: 'undo' })}>
        {copy.undo}
      </button>
    </div>
  );
}

function ServerActions({
  card,
  actions,
  onOpen,
}: {
  card: AssistantCard;
  actions?: CardActions;
  onOpen: () => void;
}) {
  const selects = actions
    ? (card.actions ?? []).filter(
        (action) =>
          action.type === 'select' &&
          action.ref &&
          !(card.kind === 'compare' && card.lines?.some((line) => line.ref === action.ref)),
      )
    : [];
  const links = (card.actions ?? []).flatMap(getAssistantBookingLinks);
  if (!selects.length && !links.length) return null;
  return (
    <div className={styles.cardActions}>
      {selects.map((action) => (
        <button
          key={action.ref}
          type="button"
          className={styles.cardActionPrimary}
          onClick={() => actions?.act(action.label, { type: 'select', ref: action.ref! })}
        >
          {action.label}
        </button>
      ))}
      {links.map((link) => (
        <Link key={link.href} href={link.href} onClick={onOpen} className={styles.cardActionPrimary}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function StopRow({ stop, isLast }: { stop: ItineraryStop; isLast: boolean }) {
  const leg = [
    stop.distanceKm !== null ? t('assistant.legDistance', { km: stop.distanceKm }) : null,
    stop.minutes !== null ? t('assistant.legDuration', { minutes: stop.minutes }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className={styles.stop} data-part={stop.part ?? undefined}>
      <span className={styles.rail} aria-hidden="true">
        <span className={styles.railDot} />
        {!isLast && <span className={styles.railLine} />}
      </span>
      <div className={stop.service ? `${styles.stopBody} ${styles.serviceStop}` : styles.stopBody}>
        {stop.service && (
          <span className={styles.serviceBadge}>
            <AssistantIcon name={stop.service === 'flight' ? 'plane' : 'bed'} size={13} />
            {copy.tripflixService}
          </span>
        )}
        {!!stop.partLabel && (
          <span className={styles.partBadge}>
            {stop.part && <AssistantIcon name={PART_ICONS[stop.part]} size={13} />}
            {stop.partLabel}
          </span>
        )}
        <p className={styles.stopTitle}>{stop.title}</p>
        {!!stop.place && <p className={styles.meta}>{stop.place}</p>}
        {!!leg && (
          <p className={styles.leg}>
            <AssistantIcon name="car" size={13} />
            {leg}
          </p>
        )}
      </div>
    </li>
  );
}

/** Lộ trình dạng timeline theo ngày: ngày → mốc có buổi, tên điểm, quãng đường. */
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
    <div className={styles.card}>
      <CardHeader icon="map" title={card.title} subtitle={subtitle} />
      {days.map((day, dayIndex) => (
        <div key={`${card.ref}-day-${dayIndex}`} className={styles.day}>
          <div className={styles.dayHead}>
            <span className={styles.dayChip}>
              {day.day !== null ? t('assistant.dayLabel', { day: day.day }) : copy.otherStops}
            </span>
            <span className={styles.dayRule} />
          </div>
          <ol className={styles.stops}>
            {day.stops.map((stop, index) => (
              <StopRow key={`${card.ref}-${dayIndex}-${index}`} stop={stop} isLast={index === day.stops.length - 1} />
            ))}
          </ol>
        </div>
      ))}
      <Source card={card} />
      <UndoButton card={card} actions={actions} />
      <ServerActions card={card} actions={actions} onOpen={onOpen} />
      {!isPlan && (
        <div className={styles.cardActions}>
          {reel && (
            <Link className={styles.cardAction} href={getAssistantCardHref(card, { isReel: true })} onClick={onOpen}>
              {copy.watchReel}
            </Link>
          )}
          <Link className={styles.cardActionPrimary} href={getAssistantCardHref(card)} onClick={onOpen}>
            {copy.bookTrip}
          </Link>
        </div>
      )}
    </div>
  );
}

function WeatherCard({ card }: { card: AssistantCard }) {
  return (
    <div className={styles.card}>
      <CardHeader icon="sun" title={card.title} />
      <ul className={styles.list}>
        {card.lines?.map((line, index) => {
          const weather = parseWeatherLine(line.detail);
          return (
            <li key={`${card.ref}-${index}`} className={styles.weatherRow}>
              <span className={styles.weatherIcon}>
                <AssistantIcon name={SKY_ICONS[weather.skyKind]} size={22} />
              </span>
              <div className={styles.grow}>
                <p className={styles.strong}>{line.label}</p>
                <p className={styles.meta}>{weather.sky ?? line.detail}</p>
              </div>
              <div className={styles.weatherRight}>
                {weather.minC !== null && weather.maxC !== null && (
                  <p className={styles.temperature}>
                    {t('assistant.temperatureRange', { min: weather.minC, max: weather.maxC })}
                  </p>
                )}
                {weather.rainChance !== null && (
                  <span className={styles.rainChip}>
                    <AssistantIcon name="drop" size={12} />
                    {t('assistant.rainChance', { percent: weather.rainChance })}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Source card={card} />
    </div>
  );
}

/** Checklist, so sánh, tóm tắt, di chuyển: danh sách dòng gọn, dòng so sánh có nút Chọn. */
function ListCard({
  card,
  actions,
  onOpen,
}: {
  card: AssistantCard;
  actions?: CardActions;
  onOpen: () => void;
}) {
  const isChecklist = card.kind === 'checklist';
  return (
    <div className={styles.card}>
      <CardHeader icon={INFO_ICONS[card.kind] ?? 'info'} title={card.title} />
      <ul className={styles.list}>
        {card.lines?.map((line, index) => (
          <li key={`${card.ref}-${index}`} className={styles.listRow}>
            {isChecklist && (
              <span className={styles.check}>
                <AssistantIcon name="check" size={14} />
              </span>
            )}
            <div className={styles.grow}>
              <p className={styles.strong}>{line.label}</p>
              {!!line.detail && <p className={styles.meta}>{line.detail}</p>}
            </div>
            {!!line.ref && actions && (
              <button
                type="button"
                aria-label={`${copy.choose}: ${line.label}`}
                className={styles.cardActionPrimary}
                onClick={() => actions.act(`${copy.choose} ${line.label}`, { type: 'select', ref: line.ref ?? '' })}
              >
                {copy.choose}
              </button>
            )}
          </li>
        ))}
      </ul>
      <Source card={card} />
      <UndoButton card={card} actions={actions} />
      <ServerActions card={card} actions={actions} onOpen={onOpen} />
    </div>
  );
}

function infoCard(card: AssistantCard, reel: Reel | undefined, onOpen: () => void, actions?: CardActions): ReactNode {
  if (card.kind === 'itinerary') return <ItineraryCard card={card} reel={reel} onOpen={onOpen} actions={actions} />;
  if (card.kind === 'weather') return <WeatherCard card={card} />;
  return <ListCard card={card} actions={actions} onOpen={onOpen} />;
}

/** Thẻ Tripi tìm được: video thành hàng thẻ dọc như Reels; lộ trình, thời tiết, danh sách, phòng/vé là khối riêng. */
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
  // Thẻ lạ (web chưa biết) thì bỏ qua thay vì hiện dòng bấm vào trang sai.
  const others = cards.filter((card) => ['stay', 'flight', 'post', 'plan'].includes(card.kind));
  const reelIds = [...videos, ...infos.filter((card) => card.kind === 'itinerary')].map((card) => card.id);
  const reels = useFeedReels(reelIds).data ?? {};
  return (
    <div className={styles.cards}>
      {videos.length > 0 && (
        <div className={styles.videos}>
          {videos.map((card) => {
            const reel = reels[card.id];
            return (
              <Link
                key={card.ref}
                href={getAssistantCardHref(card, { isReel: Boolean(reel) })}
                onClick={onOpen}
                aria-label={`${copy.watchVideo}: ${card.title}`}
                className={styles.video}
                style={reel ? { backgroundImage: `url(${JSON.stringify(reel.poster)})` } : undefined}
              >
                <span className={styles.play}>
                  <AssistantIcon name="play" size={16} />
                </span>
                <span className={styles.videoCaption}>{card.title}</span>
              </Link>
            );
          })}
        </div>
      )}
      {infos.map((card) => (
        <div key={card.ref}>{infoCard(card, reels[card.id], onOpen, actions)}</div>
      ))}
      {others.map((card) => (
        <div key={card.ref}>
          <Link href={getAssistantCardHref(card)} onClick={onOpen} className={styles.rowCard}>
            <span className={styles.cardIcon}>
              <AssistantIcon name={ROW_ICONS[card.kind] ?? 'map'} />
            </span>
            <span className={styles.grow}>
              <span className={styles.rowTitle}>{card.title}</span>
              {card.priceFrom !== null && (
                <span className={styles.price}>
                  {copy.priceFrom} {formatVnd(card.priceFrom)}
                </span>
              )}
            </span>
            <AssistantIcon name="chevron" size={18} />
          </Link>
          <ServerActions card={card} actions={actions} onOpen={onOpen} />
        </div>
      ))}
    </div>
  );
}
