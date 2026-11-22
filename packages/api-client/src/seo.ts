// Đọc dữ liệu công khai cho metadata, sitemap và JSON-LD phía server (TF112).
// Mỗi request mang baseUrl riêng và không gắn token, nên không đụng cấu hình configureHttp của phiên người dùng.
import { followsControllerGetProfile } from './generated/core-api/social-follows/social-follows';
import { hotelsControllerGetHotel } from './generated/core-api/hotels/hotels';
import { feedControllerGetFeed } from './generated/core-api/feed/feed';
import {
  postsControllerGetPostDetail,
  postsControllerListPublicPosts,
} from './generated/core-api/social-posts/social-posts';
import type {
  HotelDetailDto,
  PublicProfileDto,
  SocialPostDetailDto,
  SocialPostDto,
  SocialPostPageDto,
} from './generated/core-api/model';
import type { HttpRequestOptions } from './http';
import { readEntity, readPage } from './response';

export interface SeoRequestOptions {
  /** Địa chỉ gateway mà server Next gọi tới. */
  baseUrl: string;
  signal?: AbortSignal;
}

const toRequest = ({ baseUrl, signal }: SeoRequestOptions): HttpRequestOptions => ({
  baseUrl,
  signal,
  skipAuthorization: true,
  skipAuthRefresh: true,
});

export const seoApi = {
  async getHotel(slug: string, options: SeoRequestOptions): Promise<HotelDetailDto> {
    const response = await hotelsControllerGetHotel(encodeURIComponent(slug), {}, toRequest(options));
    return readEntity(response.data, ['id', 'slug', 'name']);
  },
  /** Chi tiết bài đúng hình dạng socialApi.getPost (post, viewerContext, shareUrl), dùng để prefetch trang lộ trình (TF113). */
  async getPostDetail(id: string, options: SeoRequestOptions): Promise<SocialPostDetailDto> {
    const response = await postsControllerGetPostDetail(encodeURIComponent(id), toRequest(options));
    return readEntity(response.data, ['post', 'viewerContext', 'shareUrl']);
  },
  async getPost(id: string, options: SeoRequestOptions): Promise<SocialPostDto> {
    const response = await postsControllerGetPostDetail(encodeURIComponent(id), toRequest(options));
    return readEntity(response.data, ['post']).post;
  },
  async getProfile(userId: string, options: SeoRequestOptions): Promise<PublicProfileDto> {
    const response = await followsControllerGetProfile(encodeURIComponent(userId), toRequest(options));
    return readEntity(response.data, ['id', 'displayName']);
  },
  async listPosts(cursor: string | undefined, options: SeoRequestOptions): Promise<SocialPostPageDto> {
    const response = await postsControllerListPublicPosts({ limit: 50, cursor }, toRequest(options));
    return readPage(response.data);
  },
  /**
   * Trang 1 vlog công khai của tác giả, đúng tham số mà useAuthorVlogs gọi ở client (TF113).
   * Dùng để đưa vào cache trước khi trang hồ sơ hiển thị, không đổi dữ liệu.
   */
  async listAuthorVlogs(authorId: string, options: SeoRequestOptions): Promise<SocialPostPageDto> {
    const response = await postsControllerListPublicPosts(
      { author_id: authorId, post_type: 'vlog' },
      toRequest(options),
    );
    return readPage(response.data);
  },
  /**
   * Tác giả có ít nhất một bài hoặc Reels công khai. Reels không nằm trong danh sách bài, nên kiểm tra thêm
   * bảng tin Reels lọc theo tác giả. Chỉ đọc 1 mục mỗi nguồn để nhẹ cho API.
   */
  async hasPublicContent(authorId: string, options: SeoRequestOptions): Promise<boolean> {
    const posts = readPage(
      (await postsControllerListPublicPosts({ author_id: authorId, limit: 1 }, toRequest(options))).data,
    );
    if (
      posts.items.some(
        (post) => post.visibility === 'public' && post.status === 'published' && !post.deletedAt,
      )
    ) {
      return true;
    }
    const reels = readPage(
      (await feedControllerGetFeed({ author_id: authorId, limit: 1 }, toRequest(options))).data,
    );
    return reels.items.length > 0;
  },
};
