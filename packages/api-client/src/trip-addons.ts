import { useQuery } from '@tanstack/react-query';
import { tripAddonsControllerSuggest } from './generated/core-api/discovery/discovery';
import type {
  FlightPickDto,
  StayPickDto,
  TripAddonRequestDto,
  TripAddonsDto,
} from './generated/core-api/model';
import { readEntity } from './response';
import { useApiSession } from './session';

export type TripAddonRequest = TripAddonRequestDto;
export type TripAddons = TripAddonsDto;
export type TripAddonFlight = FlightPickDto;
export type TripAddonStay = StayPickDto;

/**
 * Gợi ý phần còn thiếu của chuyến trước khi giữ chỗ (TF39, POST /api/recommendations/trip-addons):
 * có phòng thì gợi ý vé khứ hồi, có vé thì gợi ý khách sạn, chia theo nhóm tiêu chí kèm nhãn lý do.
 * Mục chọn từ gợi ý được gửi chung với các mục cũ trong một POST /checkout.
 */
export const tripAddonsApi = {
  async suggest(request: TripAddonRequest, signal?: AbortSignal): Promise<TripAddons> {
    return readEntity((await tripAddonsControllerSuggest(request, { signal })).data, ['missing']);
  },
};

export function useTripAddons(request: TripAddonRequest | null) {
  const { isReady } = useApiSession();
  return useQuery({
    queryKey: ['trip-addons', request],
    enabled: isReady && !!request && request.items.length > 0,
    staleTime: 60_000,
    queryFn: ({ signal }) => tripAddonsApi.suggest(request!, signal),
  });
}
