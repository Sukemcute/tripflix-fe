'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { TripAttachmentDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { SocialIcon } from '../live-posts';
import { getPostCover, POST_COVER_MASCOT } from '../post-cover';
import styles from './social-feed.module.css';

export interface ItinerarySidebarPanelProps {
  className?: string;
  trip?: TripAttachmentDto | null;
  postTitle?: string;
  hashtags?: string[];
  coverImage?: string | null;
  isOpen: boolean;
  onClose: () => void;
  suggestedTripPost?: {
    title: string;
    trip: TripAttachmentDto;
    coverImage?: string;
  } | null;
  onSelectSuggestedTrip?: () => void;
}

type ItineraryTab = 'schedule' | 'destinations' | 'cost';

export function ItinerarySidebarPanel({
  className = '',
  trip,
  postTitle = 'Chuyến đi gợi ý',
  hashtags = [],
  coverImage,
  isOpen,
  onClose,
  suggestedTripPost,
  onSelectSuggestedTrip,
}: ItinerarySidebarPanelProps) {
  const [activeTab, setActiveTab] = useState<ItineraryTab>('schedule');

  // Nhom cac diem dung theo ngay (Ngay 1, Ngay 2...)
  const groupedDays = useMemo(() => {
    const items = trip?.items ?? [];
    const byDay = new Map<number, typeof items>();
    for (const item of items) {
      const list = byDay.get(item.day) ?? [];
      list.push(item);
      byDay.set(item.day, list);
    }
    return Array.from(byDay.entries()).sort(([a], [b]) => a - b);
  }, [trip?.items]);

  // Danh sach diem den (POIs) de hien thi trong tab Diem den
  const itineraryPois = useMemo(() => {
    if (!trip) return [];
    const seen = new Set<string>();
    const list: { name: string; sub?: string }[] = [];

    if (trip.hotelName?.trim()) {
      seen.add(trip.hotelName.trim().toLowerCase());
      list.push({ name: trip.hotelName.trim(), sub: 'Khách sạn lưu trú' });
    }
    if (trip.destinationName?.trim() && !seen.has(trip.destinationName.trim().toLowerCase())) {
      seen.add(trip.destinationName.trim().toLowerCase());
      list.push({ name: trip.destinationName.trim(), sub: 'Điểm đến chính' });
    }
    for (const item of trip.items ?? []) {
      const name = item.location?.trim() || item.title.trim();
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ name, sub: item.location ? item.title : undefined });
      }
    }
    return list;
  }, [trip]);

  if (!isOpen) return null;

  return (
    <aside className={`${styles.itinerarySidebar} ${className}`} aria-label={vi.api.immersiveItineraryTitle}>
      {/* 1. Header Bar voi nut thu gon */}
      <div className={styles.itineraryHeaderBar}>
        <div className={styles.itineraryHeaderTitleGroup}>
          <span className={styles.itineraryHeaderIcon} aria-hidden="true">
            <SocialIcon name="calendar" size={18} />
          </span>
          <h2 className={styles.itineraryHeaderTitle}>{vi.api.immersiveItineraryTitle}</h2>
        </div>
        <button
          type="button"
          className={styles.itineraryCollapseBtn}
          aria-label={vi.api.immersiveItineraryCollapse}
          title={vi.api.immersiveItineraryCollapse}
          onClick={onClose}
        >
          <SocialIcon name="chevronLeft" size={18} />
        </button>
      </div>

      {/* 2. Truong hop bai viet co lich trinh */}
      {trip ? (
        <div className={styles.itineraryContent}>
          {/* Card tong quan chuyen di */}
          <div className={styles.itineraryTripCard}>
            <div className={styles.itineraryTripTop}>
              <div className={styles.itineraryTripThumb}>
                <Image
                  src={coverImage ?? POST_COVER_MASCOT}
                  alt=""
                  fill
                  sizes="72px"
                  unoptimized={Boolean(coverImage?.startsWith('http'))}
                />
              </div>
              <div className={styles.itineraryTripMeta}>
                <h3 className={styles.itineraryTripTitle}>
                  {trip.hotelName ?? trip.destinationName ?? postTitle}
                </h3>
                {(trip.destinationName || hashtags.length > 0) && (
                  <p className={styles.itineraryTripTags}>
                    {[trip.destinationName, ...hashtags.slice(0, 2)].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className={styles.itineraryTripFacts}>
                  {Boolean(trip.daysCount) && (
                    <span className={styles.itineraryFactBadge}>
                      <SocialIcon name="clock" size={13} />
                      {t('api.postTripDaysBadge', { count: trip.daysCount! })}
                    </span>
                  )}
                  {Boolean(trip.estimatedCostPerPerson) && (
                    <span className={styles.itineraryFactBadge}>
                      <SocialIcon name="wallet" size={13} />
                      ~
                      {trip.estimatedCostPerPerson!.toLocaleString('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      })}
                      /người
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Link
              prefetch={false}
              href={
                trip.hotelId
                  ? `/hotels/${encodeURIComponent(trip.hotelId)}`
                  : `/search?q=${encodeURIComponent(
                      trip.hotelName ?? trip.destinationName ?? postTitle
                    )}`
              }
              className={styles.itineraryViewDetailBtn}
            >
              <span>{vi.api.immersiveViewTripDetail}</span>
              <SocialIcon name="arrowUpRight" size={15} />
            </Link>
          </div>

          {/* 3 Tabs chuyen doi */}
          <div className={styles.itineraryTabsRow} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'schedule'}
              className={`${styles.itineraryTabItem} ${
                activeTab === 'schedule' ? styles.itineraryTabItemActive : ''
              }`}
              onClick={() => setActiveTab('schedule')}
            >
              {vi.api.immersiveTabSchedule}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'destinations'}
              className={`${styles.itineraryTabItem} ${
                activeTab === 'destinations' ? styles.itineraryTabItemActive : ''
              }`}
              onClick={() => setActiveTab('destinations')}
            >
              {t('api.immersiveTabDestinations', { count: itineraryPois.length })}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'cost'}
              className={`${styles.itineraryTabItem} ${
                activeTab === 'cost' ? styles.itineraryTabItemActive : ''
              }`}
              onClick={() => setActiveTab('cost')}
            >
              {vi.api.immersiveTabCost}
            </button>
          </div>

          {/* Body cuon doc lap */}
          <div className={styles.itineraryScrollBody}>
            {activeTab === 'schedule' && (
              <>
                {groupedDays.length === 0 ? (
                  <p className={styles.itineraryEmptyText}>{vi.api.immersiveNoTimelineItems}</p>
                ) : (
                  <div className={styles.itineraryTimeline}>
                    {groupedDays.map(([dayNumber, dayItems]) => (
                      <div key={dayNumber} className={styles.itineraryDayBlock}>
                        <div className={styles.itineraryDayHeader}>
                          <span className={styles.itineraryDayDot} aria-hidden="true" />
                          <h4 className={styles.itineraryDayTitle}>
                            {t('api.immersiveDayHeading', { day: dayNumber })}
                          </h4>
                        </div>
                        <ol className={styles.itineraryStopsList}>
                          {dayItems.map((stop, stopIdx) => {
                            const stopCover = getPostCover(
                              stop.location ?? trip.destinationName,
                              stop.title
                            );
                            return (
                              <li key={stopIdx} className={styles.itineraryStopCard}>
                                {stopCover && (
                                  <div className={styles.itineraryStopThumb}>
                                    <Image src={stopCover} alt="" fill sizes="44px" />
                                  </div>
                                )}
                                <span className={styles.itineraryStopPin}>
                                  <SocialIcon name="pin" size={13} />
                                </span>
                                <div className={styles.itineraryStopInfo}>
                                  <span className={styles.itineraryStopName}>{stop.title}</span>
                                  {(stop.location || stop.notes) && (
                                    <span className={styles.itineraryStopMeta}>
                                      {[stop.location, stop.notes].filter(Boolean).join(' · ')}
                                    </span>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'destinations' && (
              <>
                {itineraryPois.length === 0 ? (
                  <p className={styles.itineraryEmptyText}>{vi.api.immersiveNoDestinations}</p>
                ) : (
                  <ul className={styles.itineraryPoiList}>
                    {itineraryPois.map((poi) => (
                      <li key={poi.name}>
                        <Link
                          prefetch={false}
                          href={`/search?q=${encodeURIComponent(poi.name)}`}
                          className={styles.itineraryPoiLink}
                        >
                          <span>
                            {poi.name}
                            {poi.sub && (
                              <span className={styles.itineraryPoiSub}> · {poi.sub}</span>
                            )}
                          </span>
                          <SocialIcon name="arrowUpRight" size={15} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {activeTab === 'cost' && (
              <div className={styles.itineraryCostContainer}>
                {trip.estimatedCostPerPerson ? (
                  <div className={styles.itineraryCostCard}>
                    <span className={styles.itineraryCostLabel}>
                      {vi.api.immersiveEstimatedBudgetLabel}
                    </span>
                    <strong className={styles.itineraryCostValue}>
                      ~
                      {trip.estimatedCostPerPerson.toLocaleString('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      })}
                    </strong>
                    <p className={styles.itineraryCostNote}>
                      Chi phí ước tính trung bình cho 1 người, bao gồm lưu trú và các điểm vui chơi gợi ý.
                    </p>
                  </div>
                ) : (
                  <p className={styles.itineraryEmptyText}>{vi.api.immersiveNoCostData}</p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 3. Truong hop bai viet hien tai khong co lich trinh */
        <div className={styles.itineraryNoTripContainer}>
          <div className={styles.itineraryNoTripCard}>
            <div className={styles.itineraryNoTripIcon}>
              <SocialIcon name="calendar" size={28} />
            </div>
            <h4 className={styles.itineraryNoTripTitle}>Chưa có lịch trình</h4>
            <p className={styles.itineraryNoTripDesc}>
              Bài viết bạn đang xem chia sẻ hình ảnh và cảm nhận du lịch mà không đính kèm lịch trình chi tiết.
            </p>

            {suggestedTripPost && (
              <div className={styles.itinerarySuggestedBox}>
                <span className={styles.itinerarySuggestedHeading}>Lịch trình liên quan:</span>
                <button
                  type="button"
                  className={styles.itinerarySuggestedCard}
                  onClick={onSelectSuggestedTrip}
                >
                  <div className={styles.itinerarySuggestedThumb}>
                    <Image
                      src={suggestedTripPost.coverImage ?? POST_COVER_MASCOT}
                      alt=""
                      fill
                      sizes="48px"
                    />
                  </div>
                  <div className={styles.itinerarySuggestedMeta}>
                    <span className={styles.itinerarySuggestedTitle}>{suggestedTripPost.title}</span>
                    <span className={styles.itinerarySuggestedAction}>Xem lịch trình này</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
