import { getBookableTripPlan, TRIP_PLAN_MAX_DAYS, type TripPlanMode } from './trip-plan';

export interface TripPlanSelection {
  postId: string;
  postTitle: string;
  authorName: string;
  coverUrl?: string;
  trip: {
    hotelId?: string;
    hotelName?: string;
    destinationName?: string;
    daysCount?: number;
    items?: {
      day: number;
      title: string;
      location?: string;
      notes?: string;
      transport?: { mode: TripPlanMode; fromAirport?: string; toAirport?: string };
    }[];
  };
}

/** Chỉ khôi phục lộ trình còn đủ dữ liệu đặt; bỏ dữ liệu lưu hỏng hoặc khác phiên bản. */
export function parseTripPlanSelection(raw: string | null): TripPlanSelection | null {
  if (!raw) return null;
  try {
    const selected = JSON.parse(raw) as TripPlanSelection | null;
    if (
      !selected ||
      typeof selected !== 'object' ||
      typeof selected.postId !== 'string' ||
      !selected.postId ||
      typeof selected.postTitle !== 'string' ||
      typeof selected.authorName !== 'string' ||
      (selected.coverUrl !== undefined && typeof selected.coverUrl !== 'string')
    )
      return null;
    const trip = selected.trip;
    if (
      !trip ||
      typeof trip !== 'object' ||
      [trip.hotelId, trip.hotelName, trip.destinationName].some(
        (value) => value !== undefined && typeof value !== 'string',
      ) ||
      (trip.daysCount !== undefined &&
        (!Number.isInteger(trip.daysCount) || trip.daysCount < 1 || trip.daysCount > TRIP_PLAN_MAX_DAYS))
    )
      return null;
    if (
      trip.items !== undefined &&
      (!Array.isArray(trip.items) ||
        trip.items.some((item) => {
          if (
            !item ||
            typeof item !== 'object' ||
            !Number.isInteger(item.day) ||
            item.day < 1 ||
            item.day > TRIP_PLAN_MAX_DAYS ||
            typeof item.title !== 'string' ||
            [item.location, item.notes].some((value) => value !== undefined && typeof value !== 'string')
          )
            return true;
          const transport = item.transport;
          return (
            transport !== undefined &&
            (!transport ||
              typeof transport !== 'object' ||
              !['flight', 'bus', 'train', 'car', 'other'].includes(transport.mode) ||
              [transport.fromAirport, transport.toAirport].some(
                (value) => value !== undefined && typeof value !== 'string',
              ))
          );
        }))
    )
      return null;
    return getBookableTripPlan(trip) ? selected : null;
  } catch {
    return null;
  }
}
