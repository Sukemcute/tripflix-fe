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

/** Ngày YYYY-MM-DD có thật trên lịch (loại 2026-02-30). */
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const day = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value;
}

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
  if (!isCalendarDate(date) || date < today) return null;
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

/** Ngày về của vé khứ hồi: ngày có thật, không trước ngày đi. */
export function parseFlightReturnDate(value: string, departDate: string): string | null {
  const date = value.trim();
  return isCalendarDate(date) && date >= departDate ? date : null;
}

/** Lượt tìm chiều về: đảo hai sân bay, bay vào ngày về, giữ số khách và cách sắp xếp. */
export function getReturnFlightSearch(search: FlightSearch, returnDate: string): FlightSearch {
  const { from, to, passengers, sort } = search;
  const returnSearch: FlightSearch = { from: to, to: from, date: returnDate, passengers };
  return sort ? { ...returnSearch, sort } : returnSearch;
}

export interface FlightLegChoice {
  productId: string;
  ratePlanCode: string;
}

/** Một đơn gồm hai vé: chiều đi bay ngày đi, chiều về bay ngày về, cùng số khách. */
export function buildRoundTripCheckout(
  search: FlightSearch,
  returnDate: string,
  outbound: FlightLegChoice,
  inbound: FlightLegChoice,
): CheckoutRequestDto {
  return {
    adults: search.passengers,
    items: [
      { productId: outbound.productId, checkIn: search.date, ratePlanCode: outbound.ratePlanCode },
      { productId: inbound.productId, checkIn: returnDate, ratePlanCode: inbound.ratePlanCode },
    ],
  };
}
