import {
  FlightsControllerSearchSort,
  type CheckoutRequestDto,
  type FlightOfferDto,
  type FlightRouteDto,
  type FlightsControllerSearchParams,
} from './generated/core-api/model';

export interface FlightSearch extends FlightsControllerSearchParams {
  passengers: number;
}

const VIETNAM_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

export function getFlightToday() {
  return VIETNAM_DATE.format(new Date());
}

const FLIGHT_SORTS: readonly string[] = Object.values(FlightsControllerSearchSort);

export function parseFlightSearch(
  input: { from: string; to: string; date: string; passengers: string; sort?: string },
  today = getFlightToday(),
): FlightSearch | null {
  const from = input.from.trim().toUpperCase();
  const to = input.to.trim().toUpperCase();
  const date = input.date.trim();
  const passengers = Number(input.passengers);
  const airportCode = /^[A-Z]{3}$/;
  if (!airportCode.test(from) || !airportCode.test(to) || from === to) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) return null;
  const day = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) return null;
  if (!/^[1-9]$/.test(input.passengers)) return null;
  const sort =
    input.sort && FLIGHT_SORTS.includes(input.sort) ? (input.sort as FlightsControllerSearchSort) : undefined;
  return sort ? { from, to, date, passengers, sort } : { from, to, date, passengers };
}

/** Gom tuyến theo cặp sân bay; một cặp có thể có nhiều tên điểm đến, số chuyến được cộng dồn. */
export function groupFlightRoutes(routes: FlightRouteDto[]) {
  const origins = new Map<string, Map<string, { names: Set<string>; flightCount: number }>>();
  for (const route of routes) {
    const destinations =
      origins.get(route.fromAirport) ?? new Map<string, { names: Set<string>; flightCount: number }>();
    const destination = destinations.get(route.toAirport) ?? { names: new Set<string>(), flightCount: 0 };
    destination.names.add(route.destinationName);
    destination.flightCount += route.flightCount;
    destinations.set(route.toAirport, destination);
    origins.set(route.fromAirport, destinations);
  }
  return [...origins].map(([airport, destinations]) => ({
    airport,
    destinations: [...destinations].map(([code, { names, flightCount }]) => ({
      code,
      name: [...names].join(' / '),
      flightCount,
    })),
  }));
}

export function groupFlightOffers(offers: FlightOfferDto[]) {
  const flights = new Map<string, FlightOfferDto[]>();
  for (const offer of offers) {
    const cabins = flights.get(offer.flightKey) ?? [];
    cabins.push(offer);
    flights.set(offer.flightKey, cabins);
  }
  return [...flights.values()];
}

export function buildFlightCheckout(
  search: FlightSearch,
  productId: string,
  ratePlanCode: string,
): CheckoutRequestDto {
  return { adults: search.passengers, items: [{ productId, checkIn: search.date, ratePlanCode }] };
}
