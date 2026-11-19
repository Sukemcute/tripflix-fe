// Đọc dữ liệu công khai cho metadata, sitemap và JSON-LD phía server (TF112).
// Mỗi request mang baseUrl riêng và không gắn token, nên không đụng cấu hình configureHttp của phiên người dùng.
import { followsControllerGetProfile } from './generated/core-api/social-follows/social-follows';
import { hotelsControllerGetHotel } from './generated/core-api/hotels/hotels';
import {
  postsControllerGetPostDetail,
  postsControllerListPublicPosts,
} from './generated/core-api/social-posts/social-posts';
import type {
  HotelDetailDto,
  PublicProfileDto,
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
};
