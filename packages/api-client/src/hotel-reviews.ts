import { getHotelsControllerListReviewsUrl } from './generated/core-api/hotels/hotels';
import type { HotelReviewPageDto } from './generated/core-api/model';
import { http, type HttpResponse } from './http';
import { readEntity } from './response';

// The endpoint accepts filters at runtime; its current OpenAPI omits query parameters.
export interface HotelReviewFilters {
  sort?: 'newest' | 'highest' | 'lowest' | 'helpful';
  rating?: number;
  tag?: string;
  travelerType?: 'family' | 'couple' | 'solo' | 'business' | 'friends';
  page?: number;
  limit?: number;
}

export async function getHotelReviews(
  id: string,
  filters: HotelReviewFilters = {},
  signal?: AbortSignal,
): Promise<HotelReviewPageDto> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const response = await http<HttpResponse<HotelReviewPageDto>>(
    `${getHotelsControllerListReviewsUrl(encodeURIComponent(id))}?${params}`,
    { signal },
  );
  return readEntity(response.data, ['hotelId', 'summary', 'items', 'total', 'page', 'limit']);
}
