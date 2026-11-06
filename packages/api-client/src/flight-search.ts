import type {
  CheckoutRequestDto,
  FlightOfferDto,
  FlightRouteDto,
  FlightsControllerSearchParams,
} from './generated/core-api/model';

export interface FlightSearch extends FlightsControllerSearchParams {
  passengers: number;
}

const VIETNAM_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

export function getFlightToday() {
  return VIETNAM_DATE.format(new Date());
}

export function parseFlightSearch(
  input: { from: string; to: string; date: string; passengers: string },
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
  return { from, to, date, passengers };
}

export function groupFlightRoutes(routes: FlightRouteDto[]) {
  const origins = new Map<string, Map<string, Set<string>>>();
  for (const route of routes) {
    const destinations = origins.get(route.fromAirport) ?? new Map<string, Set<string>>();
    const names = destinations.get(route.toAirport) ?? new Set<string>();
    names.add(route.destinationName);
    destinations.set(route.toAirport, names);
    origins.set(route.fromAirport, destinations);
  }
  return [...origins].map(([airport, destinations]) => ({
    airport,
    destinations: [...destinations].map(([code, names]) => ({ code, name: [...names].join(' / ') })),
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
