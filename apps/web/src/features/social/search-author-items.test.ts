import { describe, expect, it } from 'vitest';
import type { FeedCardDto, SocialPostDto, UserSearchItemDto } from '@tripflix/api-client/core-api/model/index';
import {
  buildAuthorExploreItems,
  deduplicateUsers,
  feedCardToExploreItem,
  feedCardToGridCard,
  mergeSearchGridCards,
  socialPostToExploreItem,
  socialPostToGridCard,
} from './search-author-items';

const baseReel: FeedCardDto = {
  postId: 'reel-1',
  author: { id: 'user-1', name: null, avatarUrl: null, isKol: false },
  video: {
    hlsUrl: 'https://cdn/reel-1/master.m3u8',
    posters: {
      w360: 'https://cdn/reel-1/360.jpg',
      w540: 'https://cdn/reel-1/540.jpg',
      w720: 'https://cdn/reel-1/720.jpg',
    },
    durationSec: 25,
    aspect: '9:16',
    levels: [],
  },
  title: 'Hoàng hôn Phú Quốc',
  caption: 'Ngắm biển cuối ngày',
  region: 'Kiên Giang',
  tags: ['#phuquoc', 'sunset', ' '],
  linkedProductIds: [],
  tripAttachment: {
    destinationName: 'Phú Quốc',
    daysCount: 3,
    estimatedCostPerPerson: 2_500_000,
    posterUrl: 'https://cdn/reel-1/trip.jpg',
  },
  isVerified: true,
  counts: { likes: 120, comments: 14, saves: 8, shares: 3 },
  viewerState: null,
  reason: null,
};

const baseVlog: SocialPostDto = {
  id: 'vlog-1',
  authorId: 'user-1',
  authorName: 'Minh Bảo',
  postType: 'vlog',
  title: 'Kinh nghiệm đi Đà Lạt',
  body: 'Chi tiết lịch trình tự túc',
  hashtags: ['#dalat', 'checkin'],
  status: 'published',
  visibility: 'public',
  isVerified: false,
  mediaIds: [],
  coverMediaId: null,
  images: [{ id: 'img-1', url: 'https://cdn/vlog-1/cover.jpg', widthPx: 1200, heightPx: 900 }],
  tripAttachment: {
    destinationName: 'Đà Lạt',
    daysCount: 4,
    estimatedCostPerPerson: 3_200_000,
  },
  reactionCounts: {},
  reactionTotal: 45,
  commentCount: 9,
  shareCount: 2,
  bookmarkCount: 5,
  publishedAt: '2026-11-10T08:00:00Z',
  createdAt: '2026-11-10T07:00:00Z',
  updatedAt: '2026-11-10T08:00:00Z',
  deletedAt: null,
};

describe('feedCardToExploreItem', () => {
  it('chuyển Reel sang ExploreItemDto và dùng tên tác giả dự phòng khi FeedAuthorDto.name null', () => {
    expect(feedCardToExploreItem(baseReel, 'Minh Bảo')).toEqual({
      id: 'video:reel-1',
      kind: 'video',
      refId: 'reel-1',
      slug: null,
      title: 'Hoàng hôn Phú Quốc',
      subtitle: 'Phú Quốc',
      thumbnail: 'https://cdn/reel-1/360.jpg',
      reason: '',
      priceFrom: 2_500_000,
      days: 3,
      location: null,
      likes: 120,
      comments: 14,
      createdAt: null,
      author: { id: 'user-1', name: 'Minh Bảo', avatarUrl: null },
    });
  });

  it('rơi về caption, region, posterUrl và bỏ qua tên tác giả toàn khoảng trắng', () => {
    const mapped = feedCardToExploreItem(
      {
        ...baseReel,
        title: '   ',
        author: { ...baseReel.author, name: '   ' },
        video: { ...baseReel.video, posters: { ...baseReel.video.posters, w360: '' } },
        tripAttachment: { posterUrl: 'https://cdn/reel-1/trip.jpg' },
      },
      '   ',
    );
    expect(mapped.title).toBe('Ngắm biển cuối ngày');
    expect(mapped.subtitle).toBe('Kiên Giang');
    expect(mapped.thumbnail).toBe('https://cdn/reel-1/trip.jpg');
    expect(mapped.author?.name).toBeNull();
  });
});

describe('socialPostToExploreItem', () => {
  it('gán kind="plan" khi có daysCount và giữ đầy đủ trường ExploreItemDto', () => {
    expect(socialPostToExploreItem(baseVlog)).toEqual({
      id: 'plan:vlog-1',
      kind: 'plan',
      refId: 'vlog-1',
      slug: null,
      title: 'Kinh nghiệm đi Đà Lạt',
      subtitle: 'Đà Lạt',
      thumbnail: 'https://cdn/vlog-1/cover.jpg',
      reason: '',
      priceFrom: 3_200_000,
      days: 4,
      location: null,
      likes: 45,
      comments: 9,
      createdAt: '2026-11-10T08:00:00Z',
      author: { id: 'user-1', name: 'Minh Bảo', avatarUrl: null },
    });
  });

  it('gán kind="post" khi không có daysCount và lấy fallback caption/mediaIds/authorName', () => {
    const mapped = socialPostToExploreItem(
      {
        ...baseVlog,
        id: 'vlog-2',
        authorName: '   ',
        title: '',
        body: '\n  Cà phê sáng Hội An\nDòng 2',
        images: [],
        mediaIds: ['local-id', 'https://cdn/vlog-2/photo.jpg'],
        tripAttachment: null,
        publishedAt: null,
      },
      'Hồng Anh',
    );
    expect(mapped.id).toBe('post:vlog-2');
    expect(mapped.kind).toBe('post');
    expect(mapped.title).toBe('Cà phê sáng Hội An');
    expect(mapped.thumbnail).toBe('https://cdn/vlog-2/photo.jpg');
    expect(mapped.createdAt).toBe(baseVlog.createdAt);
    expect(mapped.author?.name).toBe('Hồng Anh');
  });
});

describe('buildAuthorExploreItems', () => {
  it('gộp reels rồi vlogs, khử trùng theo excludeRefIds và nội bộ, giới hạn tối đa 6 mục', () => {
    const reels = [1, 2, 3, 4].map((i) => ({ ...baseReel, postId: `r-${i}` }));
    const vlogs = [1, 2, 3, 4].map((i) => ({ ...baseVlog, id: i === 2 ? 'r-3' : `v-${i}` }));
    const items = buildAuthorExploreItems({
      reels: [...reels, { ...baseReel, postId: 'r-2' }],
      vlogs,
      authorName: 'Minh Bảo',
      excludeRefIds: new Set(['r-1']),
    });
    expect(items.map((item) => item.refId)).toEqual(['r-2', 'r-3', 'r-4', 'v-1', 'v-3', 'v-4']);
  });
});

describe('deduplicateUsers', () => {
  it('loại bỏ người dùng trùng id giữa các trang và giữ thứ tự đầu tiên', () => {
    const users: UserSearchItemDto[] = [
      { id: 'u-1', displayName: 'An' },
      { id: 'u-2', displayName: 'Bảo' },
      { id: 'u-1', displayName: 'An (trùng)' },
      { id: 'u-3', displayName: 'Chi' },
    ];
    expect(deduplicateUsers(users)).toEqual([
      { id: 'u-1', displayName: 'An' },
      { id: 'u-2', displayName: 'Bảo' },
      { id: 'u-3', displayName: 'Chi' },
    ]);
  });
});

describe('grid card mappers và mergeSearchGridCards', () => {
  it('Reel từ discovery không có thumbnail thì dùng poster video như trang cá nhân', () => {
    const reelPost: SocialPostDto = { ...baseVlog, id: 'reel-post', postType: 'video', images: [], video: baseReel.video };
    expect(socialPostToGridCard(reelPost, null).cover).toBe('https://cdn/reel-1/360.jpg');
    expect(socialPostToGridCard(reelPost, '').cover).toBe('https://cdn/reel-1/360.jpg');
    expect(socialPostToGridCard(reelPost, 'https://cdn/discovery.jpg').cover).toBe('https://cdn/discovery.jpg');
    expect(socialPostToGridCard({ ...reelPost, video: null }, null).cover).toBeUndefined();
  });

  it('chuẩn hoá SocialPostDto và FeedCardDto sang GridCardItem', () => {
    const postCard = socialPostToGridCard({ ...baseVlog, authorName: null }, 'https://cdn/discovery.jpg', 'Minh Bảo');
    expect(postCard).toMatchObject({
      id: 'vlog-1',
      isReel: false,
      captionText: 'Kinh nghiệm đi Đà Lạt',
      tags: ['dalat', 'checkin'],
      cover: 'https://cdn/discovery.jpg',
      likes: 45,
      authorId: 'user-1',
      authorName: 'Minh Bảo',
    });
    expect(postCard.dateText).not.toBe('');

    const reelCard = feedCardToGridCard(baseReel, 'Minh Bảo');
    expect(reelCard).toEqual({
      id: 'reel-1',
      isReel: true,
      captionText: 'Hoàng hôn Phú Quốc',
      tags: ['phuquoc', 'sunset'],
      cover: 'https://cdn/reel-1/360.jpg',
      likes: 120,
      authorId: 'user-1',
      authorName: 'Minh Bảo',
      dateText: '',
    });
  });

  it('mergeSearchGridCards giữ discovery trước và nối bài viết tác giả đã khử trùng ở tab posts', () => {
    const discoveryVlog: SocialPostDto = { ...baseVlog, id: 'd-vlog-1', title: 'Discovery vlog' };
    const discoveryReel: SocialPostDto = { ...baseVlog, id: 'd-reel-1', postType: 'video', title: 'Discovery reel' };
    const cards = mergeSearchGridCards({
      resultType: 'posts',
      discoveryItems: [discoveryVlog, discoveryReel],
      thumbnails: { 'd-vlog-1': 'https://cdn/thumb.jpg' },
      userVlogs: [
        { ...baseVlog, id: 'd-vlog-1', title: 'Trùng discovery' },
        { ...baseVlog, id: 'author-vlog-2', authorName: null, title: 'Bài của tác giả' },
      ],
      userReels: [baseReel],
      authorName: 'Minh Bảo',
    });
    expect(cards.map((card) => card.id)).toEqual(['d-vlog-1', 'author-vlog-2']);
    expect(cards[0]?.cover).toBe('https://cdn/thumb.jpg');
    expect(cards[1]?.authorName).toBe('Minh Bảo');
  });

  it('mergeSearchGridCards giữ discovery reels trước và nối author reels đã khử trùng ở tab reels', () => {
    const discoveryVlog: SocialPostDto = { ...baseVlog, id: 'd-vlog-1', title: 'Discovery vlog' };
    const discoveryReel: SocialPostDto = { ...baseVlog, id: 'reel-1', postType: 'video', title: 'Discovery reel' };
    const cards = mergeSearchGridCards({
      resultType: 'reels',
      discoveryItems: [discoveryVlog, discoveryReel],
      thumbnails: { 'reel-1': 'https://cdn/d-reel-1.jpg' },
      userVlogs: [baseVlog],
      userReels: [baseReel, { ...baseReel, postId: 'reel-2', title: 'Author reel 2' }],
      authorName: 'Minh Bảo',
    });
    expect(cards.map((card) => card.id)).toEqual(['reel-1', 'reel-2']);
    expect(cards[0]?.cover).toBe('https://cdn/d-reel-1.jpg');
    expect(cards[1]?.authorName).toBe('Minh Bảo');
  });
});
