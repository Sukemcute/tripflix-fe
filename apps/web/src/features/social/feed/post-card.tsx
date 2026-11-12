'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { vi, t } from '@tripflix/i18n';
import {
  SocialIcon,
  formatAuthorDisplay,
  formatDateVi,
  formatCompactCount,
} from '../live-posts';
import { getPostImages, POST_COVER_MASCOT } from '../post-cover';
import { AdaptivePostMedia } from './adaptive-post-media';
import styles from './social-feed.module.css';

export interface PostCardProps {
  post: SocialPostDto;
  currentUser: { id: string; displayName: string } | null;
  isLiked: boolean;
  isSaved: boolean;
  isCommentActive: boolean;
  onToggleLike: (postId: string, next: boolean) => void;
  onToggleSave: (postId: string, next: boolean) => void;
  onToggleComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onOpenTag?: (tag: string) => void;
  onViewItinerary?: (postId: string) => void;
}

export function PostCard({
  post,
  currentUser,
  isLiked,
  isSaved,
  isCommentActive,
  onToggleLike,
  onToggleSave,
  onToggleComment,
  onShare,
  onOpenTag,
  onViewItinerary,
}: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const trip = post.tripAttachment ?? null;
  const hasItinerary = Boolean(
    trip &&
      (trip.destinationName ||
        trip.hotelName ||
        trip.daysCount ||
        trip.estimatedCostPerPerson ||
        (trip.items && trip.items.length > 0))
  );

  const postImages = useMemo(() => {
    return getPostImages({
      mediaIds: post.mediaIds,
      destinationName: trip?.destinationName,
      hotelName: trip?.hotelName,
      title: post.title,
      body: post.body,
      hashtags: post.hashtags,
      itineraryItems: trip?.items,
    });
  }, [post, trip]);

  const coverImage = postImages[0]?.src;

  const authorInfo = formatAuthorDisplay(
    post.authorId,
    post.authorName,
    currentUser?.id,
    currentUser?.displayName
  );

  return (
    <article
      className={`${styles.postCard} ${isCommentActive ? styles.postCardActiveComment : ''}`}
      aria-label={post.title}
    >
      {/* 1. Post Header: Avatar, Name, Handle, Date, Menu */}
      <header className={styles.postHeader}>
        <div className={styles.authorLeft}>
          <div className={styles.authorAvatar}>
            {authorInfo.name.charAt(0).toUpperCase()}
          </div>
          <div className={styles.authorMeta}>
            <div className={styles.authorNameRow}>
              <span className={styles.authorName}>{authorInfo.name}</span>
              {post.isVerified && (
                <span className={styles.authorVerified} title="Tài khoản đã xác minh">
                  <SocialIcon name="verified" size={15} />
                </span>
              )}
            </div>
            <div className={styles.authorSubRow}>
              <span>{authorInfo.handle}</span>
              <span>·</span>
              <time dateTime={post.createdAt}>{formatDateVi(post.createdAt)}</time>
              {trip?.destinationName && (
                <>
                  <span>·</span>
                  <span style={{ color: '#FF6A00' }}>{trip.destinationName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.headerMenuBtn}
          title="Tùy chọn bài viết"
          aria-label="Tùy chọn bài viết"
        >
          <SocialIcon name="more" size={18} />
        </button>
      </header>

      {/* 2. Body: Title, Content, Hashtags */}
      {post.title && <h3 className={styles.postTitle}>{post.title}</h3>}
      {post.body && (
        <div>
          <p
            className={`${styles.postContent} ${!isExpanded ? styles.postContentClamped : ''}`}
          >
            {post.body}
          </p>
          {post.body.length > 140 && (
            <button
              type="button"
              className={styles.postReadMoreBtn}
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              {isExpanded ? 'Thu gọn' : 'Xem thêm'}
            </button>
          )}
        </div>
      )}

      {post.hashtags && post.hashtags.length > 0 && (
        <div className={styles.postTagsWrap}>
          {post.hashtags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={styles.postTagPill}
              onClick={() => onOpenTag?.(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* 3. Adaptive Media (ảnh); bài viết không kèm video */}
      <AdaptivePostMedia postTitle={post.title} images={postImages} />

      {/* 4. Attached Trip Card (neu co) */}
      {hasItinerary && trip && (
        <button
          type="button"
          className={styles.postAttachedTrip}
          onClick={() => onViewItinerary?.(post.id)}
          title="Xem chi tiết lịch trình bên cạnh"
        >
          <div className={styles.tripCardLeft}>
            <div className={styles.tripCardThumb}>
              <Image
                src={coverImage ?? POST_COVER_MASCOT}
                alt=""
                fill
                sizes="48px"
                unoptimized={Boolean(coverImage?.startsWith('http'))}
              />
            </div>
            <div className={styles.tripCardMeta}>
              <span className={styles.tripCardTitle}>
                {trip.hotelName ?? trip.destinationName ?? post.title}
              </span>
              <span className={styles.tripCardSub}>
                {[
                  trip.items?.length
                    ? t('api.immersiveStopsCount', { count: trip.items.length })
                    : trip.daysCount
                    ? t('api.postTripDaysBadge', { count: trip.daysCount })
                    : null,
                  trip.estimatedCostPerPerson
                    ? `~${trip.estimatedCostPerPerson.toLocaleString('vi-VN')}d/nguoi`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#006655' }}>Xem lịch trình</span>
            <SocialIcon name="chevronRight" size={16} />
          </div>
        </button>
      )}

      {/* 5. Action Bar: Like, Comment, Bookmark/Save, Share, Focus Mode */}
      <footer className={styles.postActionBar}>
        <div className={styles.actionGroupLeft}>
          {/* Like Button */}
          <button
            type="button"
            className={`${styles.actionBtn} ${isLiked ? styles.actionBtnLiked : ''}`}
            aria-pressed={isLiked}
            aria-label={vi.api.like}
            onClick={() => onToggleLike(post.id, !isLiked)}
          >
            <SocialIcon name={isLiked ? 'heartFilled' : 'heart'} size={18} />
            <span>{formatCompactCount(post.reactionTotal)}</span>
          </button>

          {/* Comment Button (Mo Contextual Panel phai) */}
          <button
            type="button"
            className={`${styles.actionBtn} ${isCommentActive ? styles.actionBtnActive : ''}`}
            aria-pressed={isCommentActive}
            aria-label={t('api.commentsWithCount', { count: post.commentCount })}
            onClick={() => onToggleComment(post.id)}
          >
            <SocialIcon name="comment" size={18} />
            <span>{formatCompactCount(post.commentCount)}</span>
          </button>

          {/* Itinerary shortcut if post has trip */}
          {hasItinerary && (
            <button
              type="button"
              className={styles.actionBtn}
              title="Xem lịch trình bên cạnh"
              aria-label="Xem lịch trình bên cạnh"
              onClick={() => onViewItinerary?.(post.id)}
            >
              <SocialIcon name="calendar" size={17} />
              <span>Lịch trình</span>
            </button>
          )}

          {/* Bookmark/Save Button */}
          <button
            type="button"
            className={`${styles.actionBtn} ${isSaved ? styles.actionBtnSaved : ''}`}
            aria-pressed={isSaved}
            aria-label={isSaved ? vi.api.unbookmark : vi.api.bookmark}
            onClick={() => onToggleSave(post.id, !isSaved)}
          >
            <SocialIcon name={isSaved ? 'bookmarkFilled' : 'bookmark'} size={18} />
            <span>{formatCompactCount(post.bookmarkCount)}</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            className={styles.actionBtn}
            aria-label={vi.api.share}
            onClick={() => onShare(post.id)}
          >
            <SocialIcon name="share" size={18} />
            <span>{formatCompactCount(post.shareCount)}</span>
          </button>
        </div>
      </footer>
    </article>
  );
}

