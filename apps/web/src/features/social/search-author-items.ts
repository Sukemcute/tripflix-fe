import type { ExploreItemDto, FeedCardDto, SocialPostDto, UserSearchItemDto } from '@tripflix/api-client/core-api/model/index';
import { getPostImages } from './post-cover';
import { isReelPost } from './post-type-filter';
import { formatSearchCardDate, getSearchCardCaption } from './search-result-card';
import type { SearchResultType } from './search-url';

export const AUTHOR_POSTS_PREVIEW_LIMIT = 6;

export interface GridCardItem {
  id: string;
  isReel: boolean;
  captionText: string;
  tags: string[];
  cover: string | undefined;
  likes: number;
  authorId: string;
  authorName: string | null | undefined;
  dateText: string;
}

function resolveAuthorName(primary?: string | null, fallback?: string | null): string | null {
  return primary?.trim() || fallback?.trim() || null;
}

function getReelTitle(reel: FeedCardDto): string {
  return reel.title.trim() || reel.caption.trim();
}

function getReelThumbnail(reel: FeedCardDto): string | null {
  return reel.video.posters.w360 || reel.tripAttachment?.posterUrl || null;
}

/** Poster của Reel từ chi tiết bài (cùng nguồn trang cá nhân dùng), không có thì ảnh bìa lịch trình. */
function getPostVideoPoster(post: SocialPostDto): string | undefined {
  return post.video?.posters.w360 || post.tripAttachment?.posterUrl || undefined;
}

/** Ảnh bìa bài viết khi discovery chưa trả thumbnail: ảnh đầu tác giả tải lên, không có thì ảnh minh hoạ theo điểm đến. */
export function getVlogCover(post: SocialPostDto): string | undefined {
  return getPostImages({
    uploadedImageUrls: post.images?.map((image) => image.url),
    mediaIds: post.mediaIds,
    destinationName: post.tripAttachment?.destinationName,
    hotelName: post.tripAttachment?.hotelName,
    title: post.title,
    body: post.body,
    hashtags: post.hashtags,
    itineraryItems: post.tripAttachment?.items,
  })[0]?.src;
}

/** Chuyển Reel từ /v1/feed sang ExploreItemDto để dùng chung ResultList. */
export function feedCardToExploreItem(reel: FeedCardDto, fallbackAuthorName?: string | null): ExploreItemDto {
  return {
    id: `video:${reel.postId}`,
    kind: 'video',
    refId: reel.postId,
    slug: null,
    title: getReelTitle(reel),
    subtitle: reel.tripAttachment?.destinationName ?? reel.region ?? null,
    thumbnail: getReelThumbnail(reel),
    reason: '',
    priceFrom: reel.tripAttachment?.estimatedCostPerPerson ?? null,
    days: reel.tripAttachment?.daysCount ?? null,
    location: null,
    likes: reel.counts.likes,
    comments: reel.counts.comments,
    createdAt: null,
    author: {
      id: reel.author.id,
      name: resolveAuthorName(reel.author.name, fallbackAuthorName),
      avatarUrl: reel.author.avatarUrl,
    },
  };
}

/** Chuyển bài viết (vlog) sang ExploreItemDto để dùng chung ResultList. */
export function socialPostToExploreItem(post: SocialPostDto, fallbackAuthorName?: string | null): ExploreItemDto {
  const kind = post.tripAttachment?.daysCount ? 'plan' : 'post';
  const thumbnail =
    post.images?.[0]?.url ??
    post.tripAttachment?.posterUrl ??
    post.mediaIds.find((mediaId) => /^https?:\/\//i.test(mediaId)) ??
    null;
  return {
    id: `${kind}:${post.id}`,
    kind,
    refId: post.id,
    slug: null,
    title: getSearchCardCaption(post).text,
    subtitle: post.tripAttachment?.destinationName ?? null,
    thumbnail,
    reason: '',
    priceFrom: post.tripAttachment?.estimatedCostPerPerson ?? null,
    days: post.tripAttachment?.daysCount ?? null,
    location: null,
    likes: post.reactionTotal,
    comments: post.commentCount,
    createdAt: post.publishedAt ?? post.createdAt,
    author: {
      id: post.authorId,
      name: resolveAuthorName(post.authorName, fallbackAuthorName),
      avatarUrl: null,
    },
  };
}

/** Gộp Reels + bài viết của một tác giả, bỏ mục đã xuất hiện trong discovery và giới hạn tối đa `limit` mục. */
export function buildAuthorExploreItems({
  reels,
  vlogs,
  authorName,
  excludeRefIds,
  limit = AUTHOR_POSTS_PREVIEW_LIMIT,
}: {
  reels: readonly FeedCardDto[];
  vlogs: readonly SocialPostDto[];
  authorName?: string | null;
  excludeRefIds?: ReadonlySet<string>;
  limit?: number;
}): ExploreItemDto[] {
  const seen = new Set<string>(excludeRefIds);
  const items: ExploreItemDto[] = [];
  const pushUnique = (item: ExploreItemDto) => {
    if (items.length >= limit || seen.has(item.refId)) return;
    seen.add(item.refId);
    items.push(item);
  };
  for (const reel of reels) pushUnique(feedCardToExploreItem(reel, authorName));
  for (const vlog of vlogs) pushUnique(socialPostToExploreItem(vlog, authorName));
  return items;
}

/** Giữ thứ tự xuất hiện đầu tiên khi gộp nhiều trang người dùng. */
export function deduplicateUsers(items: readonly UserSearchItemDto[]): UserSearchItemDto[] {
  const seen = new Set<string>();
  return items.filter((user) => {
    if (seen.has(user.id)) return false;
    seen.add(user.id);
    return true;
  });
}

/** Chuẩn hoá SocialPostDto thành thẻ hiển thị trong grid tab Bài viết / Reels. */
export function socialPostToGridCard(
  post: SocialPostDto,
  thumbnail?: string | null,
  fallbackAuthorName?: string | null,
): GridCardItem {
  const isReel = isReelPost(post);
  const caption = getSearchCardCaption(post);
  return {
    id: post.id,
    isReel,
    captionText: caption.text,
    tags: caption.tags,
    // Discovery chưa có thumbnail cho video: dùng poster của Reel như trang cá nhân.
    cover: thumbnail || (isReel ? getPostVideoPoster(post) : getVlogCover(post)),
    likes: post.reactionTotal,
    authorId: post.authorId,
    authorName: resolveAuthorName(post.authorName, fallbackAuthorName),
    dateText: formatSearchCardDate(post.publishedAt ?? post.createdAt),
  };
}

/** Chuẩn hoá FeedCardDto (useAuthorReels) thành thẻ hiển thị trong grid tab Reels. */
export function feedCardToGridCard(reel: FeedCardDto, fallbackAuthorName?: string | null): GridCardItem {
  return {
    id: reel.postId,
    isReel: true,
    captionText: getReelTitle(reel),
    tags: reel.tags.map((tag) => tag.replace(/^#/u, '').trim()).filter(Boolean),
    cover: getReelThumbnail(reel) ?? undefined,
    likes: reel.counts.likes,
    authorId: reel.author.id,
    authorName: resolveAuthorName(reel.author.name, fallbackAuthorName),
    dateText: '',
  };
}

/** Giữ kết quả discovery đứng đầu, sau đó nối thêm bài viết/Reels của tác giả khớp tên và khử trùng theo ID. */
export function mergeSearchGridCards({
  resultType,
  discoveryItems,
  thumbnails,
  userVlogs,
  userReels,
  authorName,
}: {
  resultType: SearchResultType;
  discoveryItems: readonly SocialPostDto[];
  thumbnails: Readonly<Record<string, string | null | undefined>>;
  userVlogs: readonly SocialPostDto[];
  userReels: readonly FeedCardDto[];
  authorName?: string | null;
}): GridCardItem[] {
  const discoveryPosts =
    resultType === 'posts'
      ? discoveryItems.filter((post) => post.postType === 'vlog')
      : resultType === 'reels'
        ? discoveryItems.filter(isReelPost)
        : discoveryItems;
  const seenIds = new Set(discoveryPosts.map((post) => post.id));
  const cards: GridCardItem[] = discoveryPosts.map((post) => socialPostToGridCard(post, thumbnails[post.id]));

  if (resultType === 'posts') {
    for (const post of userVlogs) {
      if (seenIds.has(post.id)) continue;
      seenIds.add(post.id);
      cards.push(socialPostToGridCard(post, undefined, authorName));
    }
  } else if (resultType === 'reels') {
    for (const reel of userReels) {
      if (seenIds.has(reel.postId)) continue;
      seenIds.add(reel.postId);
      cards.push(feedCardToGridCard(reel, authorName));
    }
  }
  return cards;
}
