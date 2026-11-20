'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { TripAttachmentDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { SocialIcon } from '../live-posts';
import { POST_COVER_MASCOT } from '../post-cover';
import segmentedTabs from '../../shared/segmented-tabs.module.css';
import styles from './social-feed.module.css';
import { TripPlanTimeline } from './trip-plan-timeline';

export interface ItinerarySidebarPanelProps {
  className?: string;
  trip?: TripAttachmentDto | null;
  /** Bài đang xem: nút "Xem chi tiết chuyến đi" mở /trip-plans/{postId}. */
  postId?: string;
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
  onBrowseTripPosts?: () => void;
}

// Tab Điểm đến đã bỏ: điểm đến của từng ngày nằm ngay trong Lịch trình như sheet trên app.
type ItineraryTab = 'schedule' | 'cost';

export function ItinerarySidebarPanel({
  className = '',
  trip,
  postId,
  postTitle = 'Chuyến đi gợi ý',
  hashtags = [],
  coverImage,
  isOpen,
  onClose,
  suggestedTripPost,
  onSelectSuggestedTrip,
  onBrowseTripPosts,
}: ItinerarySidebarPanelProps) {
  const [activeTab, setActiveTab] = useState<ItineraryTab>('schedule');

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
          data-tooltip={vi.api.immersiveItineraryCollapse}
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
            {/* Ảnh hero tràn viền, tên và thông tin chuyến đi đè lên trên lớp gradient */}
            <div className={styles.itineraryHero}>
              <Image
                src={coverImage ?? POST_COVER_MASCOT}
                alt=""
                fill
                sizes="(max-width: 1439px) 310px, 340px"
                className={styles.itineraryHeroImage}
                unoptimized={Boolean(coverImage?.startsWith('http'))}
              />
              <div className={styles.itineraryHeroOverlay}>
                <h3 className={styles.itineraryTripTitle}>{postTitle}</h3>
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
                postId
                  ? `/trip-plans/${encodeURIComponent(postId)}`
                  : trip.hotelId
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

          {/* Tab Lịch trình và Chi phí */}
          <div className={`${segmentedTabs.tabs} ${styles.itineraryTabsRow}`} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'schedule'}
              className={`${segmentedTabs.tab} ${segmentedTabs.tabCompact}`}
              onClick={() => setActiveTab('schedule')}
            >
              {vi.api.immersiveTabSchedule}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'cost'}
              className={`${segmentedTabs.tab} ${segmentedTabs.tabCompact}`}
              onClick={() => setActiveTab('cost')}
            >
              {vi.api.immersiveTabCost}
            </button>
          </div>

          {/* Body cuon doc lap */}
          <div className={styles.itineraryScrollBody}>
            {activeTab === 'schedule' &&
              ((trip.items?.length ?? 0) > 0 || trip.hotelId ? (
                <TripPlanTimeline trip={trip} />
              ) : (
                <p className={styles.itineraryEmptyText}>{vi.api.immersiveNoTimelineItems}</p>
              ))}

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
                      {vi.api.immersiveEstimatedCostNote}
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
            <div className={styles.itineraryNoTripIcon} aria-hidden="true">
              <SocialIcon name="calendar" size={18} />
            </div>
            <h4 className={styles.itineraryNoTripTitle}>{vi.api.itineraryNoTripTitle}</h4>
            <p className={styles.itineraryNoTripDesc}>{vi.api.itineraryNoTripDesc}</p>

            {onBrowseTripPosts && (
              <button
                type="button"
                className={styles.itineraryNoTripBrowseBtn}
                onClick={onBrowseTripPosts}
              >
                {vi.api.itineraryBrowseTripPosts}
              </button>
            )}

            {suggestedTripPost && (
              <div className={styles.itinerarySuggestedBox}>
                <span className={styles.itinerarySuggestedHeading}>
                  {vi.api.itinerarySuggestedHeading}
                </span>
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
                      sizes="44px"
                    />
                  </div>
                  <div className={styles.itinerarySuggestedMeta}>
                    <span className={styles.itinerarySuggestedTitle}>{suggestedTripPost.title}</span>
                    <span className={styles.itinerarySuggestedAction}>
                      {vi.api.itinerarySuggestedAction}
                    </span>
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
