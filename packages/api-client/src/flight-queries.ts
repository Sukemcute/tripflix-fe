import { useQuery } from '@tanstack/react-query';
import { groupFlightOffers, groupFlightRoutes, type FlightSearch } from './flight-search';
import { flightsControllerListRoutes, flightsControllerSearch } from './generated/core-api/flights/flights';
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
