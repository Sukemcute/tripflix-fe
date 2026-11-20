import { isValidTripDate } from './mobile-review';
import { isValidTripPlanPassengers } from './trip-plan';

export interface AssistantStayContext {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
}

/** Old cards follow the current conversation; cleared dates must not resurrect an old search. */
export function resolveAssistantStayContext(
  card: { checkIn?: string | null; checkOut?: string | null },
  trip?: {
    dateFrom?: string | null;
    dateTo?: string | null;
    adults?: number;
    children?: number;
    infants?: number;
  } | null,
): AssistantStayContext {
  return {
    checkIn: (trip ? trip.dateFrom : card.checkIn) ?? '',
    checkOut: (trip ? trip.dateTo : card.checkOut) ?? '',
    adults: trip?.adults ?? 2,
    children: trip?.children ?? 0,
    infants: trip?.infants ?? 0,
  };
}

export function isValidAssistantStay(stay: AssistantStayContext, today: string): boolean {
  return (
    isValidTripDate(stay.checkIn, today) &&
    isValidTripDate(stay.checkOut, stay.checkIn) &&
    isValidTripPlanPassengers(stay, 9) &&
    stay.adults + stay.children + stay.infants <= 9
  );
}
