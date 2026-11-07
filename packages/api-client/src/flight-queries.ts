import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { groupFlightOffers, groupFlightRoutes, type FlightSearch } from './flight-search';
import {
  flightsControllerGetCalendar,
  flightsControllerGetFlight,
  flightsControllerListRoutes,
  flightsControllerSearch,
} from './generated/core-api/flights/flights';
import { useApiSession } from './session';

export function useFlightRoutes() {
  const { isReady } = useApiSession();
  return useQuery({
    queryKey: ['commerce', 'flight-routes'],
    enabled: isReady,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const { data } = await flightsControllerListRoutes({ signal });
      if (!Array.isArray(data)) throw new Error('Unexpected flight routes response');
      return groupFlightRoutes(data);
    },
  });
}

export function useFlightOffers(search: FlightSearch) {
  const { isReady } = useApiSession();
  return useQuery({
    queryKey: ['commerce', 'flight-offers', search],
    enabled: isReady,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const { data } = await flightsControllerSearch(search, { signal });
      if (!Array.isArray(data?.flights)) throw new Error('Unexpected flight offers response');
      return groupFlightOffers(data.flights);
    },
  });
}

/** Một hạng ghế của một chuyến, báo giá đúng ngày bay và số khách (GET /flights/:id). */
export function useFlightOffer(
  productId: string,
  query: { date: string; passengers: number },
  options: { enabled?: boolean } = {},
) {
  const { isReady } = useApiSession();
  return useQuery({
    queryKey: ['commerce', 'flight-offer', productId, query],
    enabled: isReady && (options.enabled ?? true),
    staleTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      const { data } = await flightsControllerGetFlight(productId, query, { signal });
      if (!data || typeof data !== 'object' || !('productId' in data)) {
        throw new Error('Unexpected flight offer response');
      }
      return data;
    },
  });
}

/** Giá rẻ nhất từng ngày trên tuyến (GET /flights/calendar), cho dải ngày kèm giá. */
export function useFlightCalendar(query: {
  from: string;
  to: string;
  start: string;
  end: string;
  passengers: number;
}) {
  const { isReady } = useApiSession();
  return useQuery({
    queryKey: ['commerce', 'flight-calendar', query],
    enabled: isReady,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const { data } = await flightsControllerGetCalendar(query, { signal });
      if (!Array.isArray(data?.days)) throw new Error('Unexpected flight calendar response');
      return data.days;
    },
  });
}
