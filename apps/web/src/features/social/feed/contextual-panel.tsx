'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SocialIcon, RightPanelCommentsSynchronized } from '../live-posts';
import styles from './social-feed.module.css';

export interface ContextualPanelProps {
  activeCommentPost: {
    id: string;
    authorId: string;
    title?: string | null;
    authorName?: string | null;
  } | null;
  onCloseComment: () => void;
  onClosePanel: () => void;
  loginHref: string;
  onSelectTag?: (tag: string) => void;
}

const TRENDING_DESTINATIONS = [
  { id: 'hoi-an', name: 'Hội An', count: '1.2k bài viết', image: '/brand/hoian.jpg', query: 'Hội An' },
  { id: 'nha-trang', name: 'Nha Trang', count: '940 bài viết', image: '/brand/sea.jpg', query: 'Nha Trang' },
  { id: 'da-nang', name: 'Đà Nẵng', count: '850 bài viết', image: '/brand/beach.jpg', query: 'Đà Nẵng' },
  { id: 'viet-nam', name: 'Khám phá Việt Nam', count: '2.4k bài viết', image: '/brand/vietnam.jpg', query: 'Việt Nam' },
];

const POPULAR_TAGS = [
  '#CheckinVietnam',
  '#Phuot',
  '#AmThucViet',
  '#DuLichChuaLanh',
  '#ReviewKhachSan',
  '#LichTrinhGiaRe',
];

export function ContextualPanel({
  activeCommentPost,
  onCloseComment,
  onClosePanel,
  loginHref,
  onSelectTag,
}: ContextualPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <aside className={styles.contextColumn} aria-label="Bảng ngữ cảnh">
      {/* Header */}
      <div className={styles.contextHeader}>
        <div className={styles.contextHeaderTitle}>
          {activeCommentPost ? (
            <>
              <SocialIcon name="comment" size={18} />
              <span>Bình luận</span>
            </>
          ) : (
            <>
              <SocialIcon name="compass" size={18} />
              <span>Khám phá Cảm hứng</span>
            </>
          )}
        </div>
        <button
          type="button"
          className={styles.contextCloseBtn}
          title={activeCommentPost ? 'Quay lại khám phá' : 'Thu gọn bảng'}
          aria-label={activeCommentPost ? 'Quay lại khám phá' : 'Thu gọn bảng'}
          onClick={activeCommentPost ? onCloseComment : onClosePanel}
        >
          <SocialIcon name="close" size={18} />
        </button>
      </div>

      {/* Body: Comments Thread vs Discovery Widgets */}
      {activeCommentPost ? (
        <div className={styles.commentsPanelInner}>
          <RightPanelCommentsSynchronized
            key={activeCommentPost.id}
            post={activeCommentPost}
            loginHref={loginHref}
            scrollContainerRef={scrollContainerRef}
            composerInputRef={composerInputRef}
          />
        </div>
      ) : (
        <div className={styles.contextBody}>
          {/* Widget 1: Điểm đến thịnh hành */}
          <section className={styles.widgetCard} aria-labelledby="heading-destinations">
            <h4 id="heading-destinations" className={styles.widgetTitle}>
              Điểm đến thịnh hành
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {TRENDING_DESTINATIONS.map((dest) => (
                <Link
                  key={dest.id}
                  href={`/search?q=${encodeURIComponent(dest.query)}`}
                  className={styles.destinationItem}
                >
                  <div className={styles.destThumb}>
                    <Image
                      src={dest.image}
                      alt={dest.name}
                      fill
                      sizes="44px"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <div className={styles.destText}>
                    <span className={styles.destName}>{dest.name}</span>
                    <span className={styles.destCount}>{dest.count}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Widget 2: Chủ đề nổi bật */}
          <section className={styles.widgetCard} aria-labelledby="heading-tags">
            <h4 id="heading-tags" className={styles.widgetTitle}>
              Chủ đề nổi bật
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={styles.postHashtag}
                  onClick={() => onSelectTag?.(tag)}
                  style={{ cursor: 'pointer' }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {/* Widget 3: Gợi ý cộng đồng */}
          <section
            className={styles.widgetCard}
            style={{
              padding: '14px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(255, 106, 0, 0.08) 0%, rgba(241, 245, 249, 0.9) 100%)',
              border: '1px solid rgba(255, 106, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <SocialIcon name="sparkles" size={16} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#FF6A00' }}>
                Chia sẻ trải nghiệm
              </span>
            </div>
            <p style={{ fontSize: '12px', lineHeight: 1.5, color: '#64748B', margin: 0 }}>
              Đăng tải nhật ký hành trình, review khách sạn và kinh nghiệm điểm đến để nhận huy hiệu đóng góp từ Tripflix.
            </p>
          </section>
        </div>
      )}
    </aside>
  );
}

