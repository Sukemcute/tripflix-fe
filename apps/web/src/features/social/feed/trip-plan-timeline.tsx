'use client';

import { getBookableTripPlan, getTripPlanCategory, type TripPlanCategory } from '@tripflix/app-core';
import type { TripAttachmentDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import type { ReactNode } from 'react';
import styles from './trip-plan-timeline.module.css';

/** Dùng đúng chữ của sheet lộ trình trên app để hai nơi giống nhau. */
const copy = vi.mobile.tripPlan;

/**
 * Lịch trình từng ngày giống sheet "Xem lộ trình" của reel trên app (TF105): chặng bay và chỗ ở thành thẻ
 * có icon, chặng tự túc ghi một dòng, các điểm còn lại là "Gợi ý từ tác giả" với icon theo loại.
 */
export function TripPlanTimeline({ trip }: { trip: TripAttachmentDto }) {
  const items = trip.items ?? [];
  const days = Math.max(trip.daysCount ?? 0, ...items.map((item) => item.day), 1);
  const plan = getBookableTripPlan(trip);
  return (
    <ol className={styles.timeline}>
      {Array.from({ length: days }, (_, index) => index + 1).map((day) => {
        const flights = (plan?.flights ?? []).filter((leg) => leg.day === day);
        const stays = (plan?.hotels ?? []).filter((stay) => stay.day === day);
        const selfArranged =
          plan?.selfArranged.filter((leg) => leg.day === day) ??
          items
            .filter((item) => item.day === day && !!item.transport)
            .map((item) => ({ title: item.title, mode: item.transport!.mode }));
        const suggestions = items.filter((item) => item.day === day && !item.transport && !item.hotel);
        return (
          <li key={day} className={styles.day}>
            {day < days && <span className={styles.rail} aria-hidden="true" />}
            <span className={styles.dayDot} aria-hidden="true" />
            <div className={styles.dayContent}>
              <h4 className={styles.dayLabel}>{t('mobile.tripPlan.day', { day })}</h4>
              {flights.map((leg, index) => (
                <ProductCard
                  key={`flight${index}`}
                  tone="flight"
                  title={`${leg.from} → ${leg.to}`}
                  detail={copy.flightTitle}
                />
              ))}
              {stays.map((stay) => (
                <ProductCard
                  key={stay.id}
                  tone="hotel"
                  title={stay.hotelName ?? trip.hotelName ?? copy.stayTitle}
                  detail={t('mobile.tripPlan.hotelTitle', { nights: stay.nights })}
                />
              ))}
              {selfArranged.map((leg, index) => (
                <p key={`self${index}`} className={styles.stop}>
                  <span className={styles.stopIcon}>
                    <TimelineIcon name="bus" />
                  </span>
                  <span className={styles.muted}>
                    {[leg.title || copy.modes[leg.mode], copy.selfArranged].join(' · ')}
                  </span>
                </p>
              ))}
              {suggestions.length > 0 && (
                <div className={styles.suggestions}>
                  <span className={styles.suggestionsLabel}>{copy.community}</span>
                  <ul className={styles.stops}>
                    {suggestions.map((item, index) => (
                      <li key={index} className={styles.stop}>
                        {/* Icon theo loại người đăng chọn; bài cũ chưa có loại thì đoán theo tên. */}
                        <span className={styles.stopIcon}>
                          <TimelineIcon name={getTripPlanCategory(item)} />
                        </span>
                        <span className={styles.stopText}>
                          <span className={styles.description}>
                            {item.time ? `${item.time} · ${item.title}` : item.title}
                          </span>
                          {!!(item.location || item.notes) && (
                            <span className={styles.muted}>
                              {[item.location, item.notes].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Icon của một điểm ở trang chi tiết chuyến đi, cùng bộ icon và màu với lịch trình ở reel. */
export function TripStopIcon({
  item,
}: {
  item: {
    title: string;
    category?: TripPlanCategory | null;
    hotel?: unknown;
    transport?: { mode: string } | null;
  };
}) {
  const name: TimelineIconName = item.hotel
    ? 'bed'
    : item.transport
      ? item.transport.mode === 'flight'
        ? 'plane'
        : 'bus'
      : getTripPlanCategory(item);
  const tone = item.hotel
    ? styles.cardIconHotel
    : item.transport?.mode === 'flight'
      ? styles.cardIconFlight
      : styles.stopIconSoft;
  return (
    <span className={`${styles.cardIcon} ${styles.stopIconSmall} ${tone}`} aria-hidden="true">
      <TimelineIcon name={name} />
    </span>
  );
}

function ProductCard({ tone, title, detail }: { tone: 'flight' | 'hotel'; title: string; detail: string }) {
  return (
    <div className={styles.card}>
      <span
        className={`${styles.cardIcon} ${tone === 'flight' ? styles.cardIconFlight : styles.cardIconHotel}`}
      >
        <TimelineIcon name={tone === 'flight' ? 'plane' : 'bed'} />
      </span>
      <span className={styles.cardBody}>
        <strong className={styles.cardTitle}>{title}</strong>
        <span className={styles.muted}>{detail}</span>
      </span>
    </div>
  );
}

type TimelineIconName = TripPlanCategory | 'plane' | 'bed' | 'bus';

/** Icon nét mảnh cùng bộ với trình soạn lộ trình trên web. */
function TimelineIcon({ name }: { name: TimelineIconName }) {
  const paths: Record<TimelineIconName, ReactNode> = {
    plane: (
      <path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L16 6.5a2 2 0 0 1 3 3l-4 4 1 7.5L14.5 22 12 14.5l-3 3V20l-1.5 1-1-3-3-1 1-1.5h2.5z" />
    ),
    bed: (
      <>
        <path d="M3 18v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8" />
        <path d="M3 14h18M3 18v2M21 18v2M7 11h3" />
      </>
    ),
    bus: (
      <>
        <rect x="5" y="3" width="14" height="15" rx="2" />
        <path d="M5 11h14M8 18v2M16 18v2M8.5 14.5h.01M15.5 14.5h.01" />
      </>
    ),
    cafe: (
      <>
        <path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
        <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M12 3v2" />
      </>
    ),
    food: <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-2 6 0 8v10M17 3v18" />,
    fun: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
      </>
    ),
    other: (
      <>
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
  };
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}
