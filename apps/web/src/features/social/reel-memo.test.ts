import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FeedCardDto } from '@tripflix/api-client/core-api/model/index';
import {
  computeReelEngagement,
  getReelBufferSeconds,
  getReelRenderMode,
  reuseReelEngagement,
  shouldLoadReelSource,
  shouldShowReelBackdrop,
  toReelPost,
  type ReelEngagement,
} from './reel-post';

function makeFeedCard(index: number, liked = false): FeedCardDto {
  return {
    postId: `reel-${index}`,
    author: { id: `author-${index}`, name: `Tác giả ${index}`, avatarUrl: null, isKol: false },
    video: {
      hlsUrl: `https://cdn/reel-${index}/master.m3u8`,
      posters: {
        w360: `https://cdn/reel-${index}/360.jpg`,
        w540: `https://cdn/reel-${index}/540.jpg`,
        w720: `https://cdn/reel-${index}/720.jpg`,
      },
      durationSec: 25,
      aspect: '9:16',
      levels: [360, 720],
    },
    title: `Chuyến đi ${index}`,
    caption: 'Nội dung mô tả ngắn gọn',
    region: null,
    tags: ['phuquoc'],
    linkedProductIds: [],
    tripAttachment: null,
    counts: { likes: 10 + index, comments: 2, saves: 1, shares: 0 },
    viewerState: { liked, saved: false },
    reason: null,
    isVerified: false,
  };
}

function shallowPropsEqual(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  const keys = Object.keys(next);
  if (keys.length !== Object.keys(prev).length) return false;
  for (const key of keys) {
    if (!Object.is(prev[key], next[key])) return false;
  }
  return true;
}

describe('PR 2a: giảm vẽ lại MediaTrackItem và ReelActionRail', () => {
  it('bấm tim 1 trong 7 Reel hoặc bật tắt showPlayFlash chỉ đổi prop của đúng 1 MediaTrackItem (6/7 bỏ qua)', () => {
    const postCache = new WeakMap<FeedCardDto, ReturnType<typeof toReelPost>>();
    const engagementCache = new Map<string, ReelEngagement>();
    const stableHandlers = {
      registerItemRef: () => {},
      onFirstFrame: () => {},
      onToggleLike: () => {},
      onToggleSave: () => {},
      onShare: () => {},
      onToggleComments: () => {},
      onMediaError: () => {},
      onRetryMedia: () => {},
      onTogglePlay: () => {},
      onToggleCaption: () => {},
      onOpenTag: () => {},
      onOpenItinerary: () => {},
    };

    const buildWindowProps = (
      cards: readonly FeedCardDto[],
      optimisticLikes: Record<string, boolean>,
      activeIndex: number,
      showPlayFlash: boolean,
      isRightOpen: boolean,
    ) => {
      const cardMap = new Map(cards.map((c) => [c.postId, c]));
      return cards.map((card, idx) => {
        const post = toReelPost(card, postCache);
        const isActive = idx === activeIndex;
        const engagement = reuseReelEngagement(
          engagementCache,
          post.id,
          computeReelEngagement({
            post,
            serverLiked: Boolean(card.viewerState?.liked),
            serverSaved: Boolean(card.viewerState?.saved),
            optimisticLiked: optimisticLikes[post.id],
          }),
        );
        return {
          ...stableHandlers,
          index: idx,
          post,
          isActive,
          hasVideo: getReelRenderMode(idx, activeIndex) === 'video',
          canLoadSource: shouldLoadReelSource(idx, activeIndex, true),
          bufferSeconds: getReelBufferSeconds(idx, activeIndex),
          hasBackdrop: shouldShowReelBackdrop(idx, activeIndex),
          engagement,
          isSignedIn: true,
          loginHref: '/login?returnTo=%2Finspiration',
          isCommentOpen: isRightOpen && isActive,
          reelCard: cardMap.get(post.id),
          viewerUserId: 'u1',
          viewerDisplayName: 'Thành',
          isMuted: isActive ? false : true,
          isPlaying: isActive ? true : false,
          showPlayFlash: isActive ? showPlayFlash : false,
          isMediaError: false,
          isCaptionExpanded: false,
        };
      });
    };

    const cards = Array.from({ length: 7 }, (_, i) => makeFeedCard(i));
    const initialProps = buildWindowProps(cards, {}, 2, false, true);

    // Giả lập bấm tim bài đang xem (#2): updateReelSocialCache chỉ thay tham chiếu đúng thẻ reel-2.
    const cardsAfterLike = cards.map((c, idx) =>
      idx === 2
        ? { ...c, viewerState: { liked: true, saved: false }, counts: { ...c.counts, likes: c.counts.likes + 1 } }
        : c,
    );
    const propsAfterLike = buildWindowProps(cardsAfterLike, { 'reel-2': true }, 2, false, true);

    const changedOnLike = propsAfterLike.filter((next, i) => !shallowPropsEqual(initialProps[i]!, next));
    expect(changedOnLike).toHaveLength(1);
    expect(changedOnLike[0]?.index).toBe(2);

    // Giả lập nháy nút play/pause hoặc đóng panel bình luận: chỉ bài #2 đổi prop, 6 bài còn lại bỏ qua.
    const propsAfterFlash = buildWindowProps(cardsAfterLike, { 'reel-2': true }, 2, true, false);
    const changedOnFlash = propsAfterFlash.filter((next, i) => !shallowPropsEqual(propsAfterLike[i]!, next));
    expect(changedOnFlash).toHaveLength(1);
    expect(changedOnFlash[0]?.index).toBe(2);
  });

  it('MediaTrackItem và ReelActionRail được bọc React.memo và nhận prop nguyên thuỷ/ổn định', () => {
    const livePostsPath = resolve(dirname(fileURLToPath(import.meta.url)), 'live-posts.tsx');
    const source = readFileSync(livePostsPath, 'utf8');

    expect(source).toContain('export const ReelActionRail = memo(function ReelActionRail(');
    expect(source).toContain('export const MediaTrackItem = memo(function MediaTrackItem(');
    expect(source).toContain('isMediaError: boolean;');
    expect(source).toContain('isCaptionExpanded: boolean;');
    expect(source).toContain('isMuted={isActiveItem ? isMuted : true}');
    expect(source).toContain('isPlaying={isActiveItem ? isPlaying : false}');
    expect(source).toContain('showPlayFlash={isActiveItem ? showPlayFlash : false}');
    expect(source).toContain('isCommentOpen={isRightOpen && isActiveItem}');
    expect(source).toContain('<ReelActionRail');
    expect(source).toContain('if (activePostIdRef.current !== postId) setActivePostId(postId);');
    expect(source).not.toContain('function renderReelActions(');
    expect(source).not.toContain('itemRef={(el) =>');
  });
});
