import { useQuery } from '@tanstack/react-query';
import {
  tripBuilderControllerSuggestFlights,
  tripBuilderControllerSuggestStays,
} from './generated/core-api/discovery/discovery';
import type {
  FlightSuggestionDto,
  FlightSuggestionsDto,
  StaySuggestionDto,
  TripBuilderControllerSuggestFlightsParams,
  TripBuilderControllerSuggestStaysParams,
} from './generated/core-api/model';
import { readEntity } from './response';
import { useApiSession } from './session';

export type TripFlightSuggestion = FlightSuggestionDto;
export type TripStaySuggestion = StaySuggestionDto;
export type TripFlightsQuery = TripBuilderControllerSuggestFlightsParams;
export type TripStaysQuery = TripBuilderControllerSuggestStaysParams;

/**
 * Gợi ý cho "Tự lên lộ trình" ở tab Đặt (TF105): vé bay và chỗ ở, GET /api/trip-builder/*.
 * Cách xếp và câu lý do nằm ở discovery; app chỉ hiện theo thứ tự trả về.
 */
export const tripBuilderApi = {
  async flights(query: TripFlightsQuery, signal?: AbortSignal): Promise<FlightSuggestionsDto> {
    return readEntity((await tripBuilderControllerSuggestFlights(query, { signal })).data, [
      'outbound',
      'inbound',
    ]);
  },
  async stays(query: TripStaysQuery, signal?: AbortSignal): Promise<StaySuggestionDto[]> {
    return readEntity((await tripBuilderControllerSuggestStays(query, { signal })).data, ['items']).items;
  },
};

export function useTripFlightSuggestions(query: TripFlightsQuery | null) {
  const { isReady } = useApiSession();
  return useQuery({
    queryKey: ['trip-builder', 'flights', query],
    enabled: isReady && !!query,
    staleTime: 60_000,
    queryFn: ({ signal }) => tripBuilderApi.flights(query!, signal),
  });
}

export function useTripStaySuggestions(query: TripStaysQuery | null) {
  const { isReady } = useApiSession();
  return useQuery({
    queryKey: ['trip-builder', 'stays', query],
    enabled: isReady && !!query,
    staleTime: 60_000,
    queryFn: ({ signal }) => tripBuilderApi.stays(query!, signal),
  });
}
