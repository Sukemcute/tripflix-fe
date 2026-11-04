import { cartSubtotal } from './booking';

export const REVIEW_PRICES = { roomPerNight: 1_490_000, flightPerGuest: 1_900_000, nights: 2 } as const;

export interface TripSelection {
  date: string;
  guests: number;
  hasFlight: boolean;
}

export interface TripQuote {
  rooms: number;
  accommodation: number;
  flights: number;
  total: number;
  perGuest: number;
}

export function calculateTripQuote(selection: Pick<TripSelection, 'guests' | 'hasFlight'>): TripQuote {
  if (!Number.isInteger(selection.guests) || selection.guests < 1 || selection.guests > 8) {
    throw new RangeError('Guests must be an integer between 1 and 8');
  }
  const rooms = Math.ceil(selection.guests / 2);
  const accommodation = cartSubtotal([
    { unitPrice: REVIEW_PRICES.roomPerNight, quantity: rooms, nights: REVIEW_PRICES.nights },
  ]);
  const flights = selection.hasFlight ? REVIEW_PRICES.flightPerGuest * selection.guests : 0;
  const total = accommodation + flights;
  return { rooms, accommodation, flights, total, perGuest: Math.ceil(total / selection.guests) };
}

export function isValidTripDate(value: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value > today;
}

export function shiftTripDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export interface ReviewSearch {
  guests: number;
  budget: number;
  hotelOnly: boolean;
  hasResults: boolean;
  perGuest: number;
}

/** Review fixtures only. Production discovery must use the generated API client. */
export function searchReviewTrips(query: string): ReviewSearch {
  const normalized = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
  const guests = Math.min(8, Math.max(1, Number(/(\d+)\s*(?:nguoi|khach)/.exec(normalized)?.[1] ?? 2)));
  const budgetMatch = /(?:duoi|toi da|ngan sach|<=?)\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|trd|k|nghin)/.exec(
    normalized,
  );
  const budget = budgetMatch
    ? Number(budgetMatch[1]!.replace(',', '.')) * (/^(k|nghin)$/.test(budgetMatch[2]!) ? 1_000 : 1_000_000)
    : Infinity;
  const hotelOnly = /chi\s*(?:dat\s*)?(?:khach san|luu tru)|khong\s*(?:can\s*)?(?:ve|may bay)/.test(
    normalized,
  );
  const { perGuest } = calculateTripQuote({ guests, hasFlight: !hotelOnly });
  const hasUnsupportedDestination = /ha noi|da lat|sapa|sa pa|phu quoc|hoi an|da nang|nhat ban|han quoc/.test(
    normalized,
  );
  return {
    guests,
    budget,
    hotelOnly,
    perGuest,
    hasResults: !!query.trim() && !hasUnsupportedDestination && perGuest <= budget,
  };
}

export function validateReviewContact(contact: {
  name: string;
  email: string;
  phone: string;
  hasConsent: boolean;
}): { name: boolean; email: boolean; phone: boolean; hasConsent: boolean } {
  return {
    name: contact.name.trim().length >= 2,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()),
    phone: /^\+?[0-9]{9,15}$/.test(contact.phone.replace(/\s/g, '')),
    hasConsent: contact.hasConsent,
  };
}
