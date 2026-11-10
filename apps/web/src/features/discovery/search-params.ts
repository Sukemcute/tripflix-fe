import type { StayFilters } from '@tripflix/api-client';
import { OTA_DESTINATIONS } from './ota-destinations';
import {
  addStayDays,
  getStayDateIssue,
  getStayPriceIssue,
  getStayToday,
  isStayDate,
  isStayInteger,
  MAX_STAY_GUESTS,
  MAX_STAY_PRICE,
  MAX_STAY_ROOMS,
} from './stay-search-validation';

export function parseSearchParams(read: (key: string) => string): {
  placeName: string;
  initialFilters: Partial<StayFilters>;
} {
  const query = read('q').slice(0, 100).trim();
  const requestedPlace = read('placeId');
  const defaultPlace = OTA_DESTINATIONS[0];
  const placeId = /^[a-z0-9-]{1,100}$/i.test(requestedPlace) ? requestedPlace : query ? '' : defaultPlace.id;
  const placeName = query || OTA_DESTINATIONS.find((place) => place.id === placeId)?.name || placeId;
  const today = getStayToday();
  const requestedCheckIn = read('checkIn');
  const requestedCheckOut = read('checkOut');
  let checkIn = isStayDate(requestedCheckIn) && requestedCheckIn >= today ? requestedCheckIn : addStayDays(today, 1);
  let checkOut = getStayDateIssue(checkIn, requestedCheckOut, today) ? addStayDays(checkIn, 2) : requestedCheckOut;
  if (!isStayDate(checkOut)) {
    checkIn = addStayDays(today, 1);
    checkOut = addStayDays(today, 3);
  }
  const initialFilters: Partial<StayFilters> = { placeId, checkIn, checkOut };
  const limits = { adults: MAX_STAY_GUESTS, rooms: MAX_STAY_ROOMS, minStars: 5, stars: 5 } as const;
  for (const key of ['adults', 'rooms', 'minStars', 'stars'] as const) {
    const value = read(key);
    if (isStayInteger(value, 1, limits[key])) initialFilters[key] = String(Number(value));
  }
  const priceMin = read('priceMin');
  const priceMax = read('priceMax');
  const validMin = isStayInteger(priceMin, 0, MAX_STAY_PRICE) ? String(Number(priceMin)) : '';
  const validMax = isStayInteger(priceMax, 0, MAX_STAY_PRICE) ? String(Number(priceMax)) : '';
  if (!getStayPriceIssue(validMin, validMax)) {
    initialFilters.priceMin = validMin;
    initialFilters.priceMax = validMax;
  }
  const sort = read('sort');
  if (sort === 'stars' || sort === 'price_desc') initialFilters.sort = sort;

  return { placeName, initialFilters };
}
