/** Phương tiện của một ngày trong lộ trình người đăng chia sẻ. */
export type TripPlanMode = 'flight' | 'bus' | 'train' | 'car' | 'other';

interface TripPlanTransport {
  mode: TripPlanMode;
  fromAirport?: string;
  toAirport?: string;
}

/** Một ngày trong trình soạn lộ trình lúc đăng bài. */
export interface TripPlanDayDraft {
  activities: { title: string; location: string }[];
  transport: { mode: TripPlanMode | null; fromCode: string; toCode: string; note: string };
}

export interface TripPlanDraft {
  destinationName: string;
  hotel: { hotelId: string; hotelName: string } | null;
  days: TripPlanDayDraft[];
}

export const EMPTY_TRIP_PLAN_DAY: TripPlanDayDraft = {
  activities: [{ title: '', location: '' }],
  transport: { mode: null, fromCode: '', toCode: '', note: '' },
};
export const TRIP_PLAN_MAX_DAYS = 30;

/**
 * Gửi phương tiện như một mục hiển thị trong ngày kèm dữ liệu tuyến để tra vé qua OTA.
 */
export function buildTripAttachment(
  draft: TripPlanDraft,
  modeLabels: Readonly<Record<TripPlanMode, string>>,
) {
  const items = draft.days.flatMap((day, index): {
    day: number;
    title: string;
    location?: string;
    notes?: string;
    transport?: TripPlanTransport;
  }[] => {
    const { mode, fromCode, toCode, note } = day.transport;
    const transport = mode
      ? [
          {
            day: index + 1,
            title: mode === 'flight' && fromCode && toCode ? `${modeLabels[mode]} ${fromCode} → ${toCode}` : modeLabels[mode],
            ...(note.trim() ? { notes: note.trim() } : {}),
            transport: {
              mode,
              ...(mode === 'flight' && fromCode && toCode ? { fromAirport: fromCode, toAirport: toCode } : {}),
            },
          },
        ]
      : [];
    const activities = day.activities
      .filter((activity) => activity.title.trim())
      .map((activity) => ({
        day: index + 1,
        title: activity.title.trim(),
        ...(activity.location.trim() ? { location: activity.location.trim() } : {}),
      }));
    return [...transport, ...activities];
  });
  if (items.length === 0 && !draft.hotel) return null;
  return {
    daysCount: draft.days.length,
    ...(draft.destinationName.trim() ? { destinationName: draft.destinationName.trim() } : {}),
    ...(draft.hotel ? { hotelId: draft.hotel.hotelId, hotelName: draft.hotel.hotelName } : {}),
    items,
  };
}

interface TripPlanFlight {
  day: number;
  from: string;
  to: string;
}

/** Mỗi phương tiện đã chọn phải có tuyến bán được qua OTA để đặt cả lộ trình trong một đơn. */
export function getBookableTripPlan(trip: {
  hotelId?: string;
  items?: readonly { day: number; transport?: TripPlanTransport }[];
}): { hotelId: string; flights: TripPlanFlight[] } | null {
  if (!trip.hotelId) return null;
  const airportCode = /^[A-Z]{3}$/;
  const flights: TripPlanFlight[] = [];
  for (const { day, transport } of trip.items ?? []) {
    if (!transport) continue;
    const { mode, fromAirport, toAirport } = transport;
    if (
      mode !== 'flight' || !Number.isInteger(day) || day < 1 || day > TRIP_PLAN_MAX_DAYS ||
      typeof fromAirport !== 'string' || typeof toAirport !== 'string' ||
      !airportCode.test(fromAirport) || !airportCode.test(toAirport) ||
      fromAirport === toAirport
    ) return null;
    flights.push({ day, from: fromAirport, to: toAirport });
  }
  if (flights.length === 0 || flights.length >= TRIP_PLAN_MAX_ITEMS) return null;
  return { hotelId: trip.hotelId, flights: flights.sort((a, b) => a.day - b.day) };
}

/** Bài có lộ trình để xem (có lịch từng ngày hoặc chỗ ở) thì mới hiện nút "Xem lộ trình". */
export function hasTripPlan(
  trip: { items?: readonly unknown[]; hotelId?: string | null } | null | undefined,
): boolean {
  return !!trip && ((trip.items?.length ?? 0) > 0 || !!trip.hotelId);
}

/** Ngày thứ `day` (bắt đầu từ 1) của chuyến khởi hành ngày `startDate` (YYYY-MM-DD). */
export function getTripDayDate(startDate: string, day: number): string {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date.toISOString().slice(0, 10);
}

/** Số đêm ở khách sạn của lộ trình `days` ngày: ở tới sáng ngày cuối, ít nhất một đêm. */
export function getTripNights(days: number): number {
  return Math.max(1, days - 1);
}

export interface TripPlanOffer {
  productId: string;
  ratePlanCode: string;
  totalPrice: number;
}

/**
 * Lựa chọn rẻ nhất còn bán: dùng cho phòng khách sạn (ratePlans) và vé bay (fares).
 * Không còn lựa chọn nào có giá thì trả null để màn hình báo hết chỗ.
 */
export function pickCheapestOffer(
  offers: readonly {
    productId: string;
    isAvailable: boolean;
    plans: readonly { code: string; totalPrice: number | null }[];
  }[],
): TripPlanOffer | null {
  let best: TripPlanOffer | null = null;
  for (const offer of offers) {
    if (!offer.isAvailable) continue;
    for (const plan of offer.plans) {
      if (plan.totalPrice === null) continue;
      if (!best || plan.totalPrice < best.totalPrice)
        best = { productId: offer.productId, ratePlanCode: plan.code, totalPrice: plan.totalPrice };
    }
  }
  return best;
}

export interface TripPlanCheckoutInput {
  adults: number;
  children?: number;
  infants?: number;
  sourcePostId: string;
  flights: readonly { productId: string; ratePlanCode: string; date: string }[];
  rooms: readonly { productId: string; ratePlanCode: string; checkIn: string; checkOut: string }[];
}

/** Giới hạn mục mỗi đơn của core (POST /checkout). */
export const TRIP_PLAN_MAX_ITEMS = 10;

/** Một đơn gồm mọi vé bay và phòng của lộ trình, ghi bài nguồn để tính "Đặt y chang". */
export function buildTripPlanCheckout(input: TripPlanCheckoutInput) {
  const items = [
    ...input.flights.map((flight) => ({
      productId: flight.productId,
      checkIn: flight.date,
      ratePlanCode: flight.ratePlanCode,
    })),
    ...input.rooms.map((room) => ({
      productId: room.productId,
      checkIn: room.checkIn,
      checkOut: room.checkOut,
      ratePlanCode: room.ratePlanCode,
    })),
  ];
  if (items.length === 0) throw new Error('Trip plan has nothing to book');
  if (items.length > TRIP_PLAN_MAX_ITEMS) throw new Error('Trip plan has too many items for one order');
  const hasFlights = input.flights.length > 0;
  // Core chỉ nhận trẻ em, em bé khi đơn có vé bay.
  return {
    adults: input.adults,
    ...(hasFlights && input.children ? { children: input.children } : {}),
    ...(hasFlights && input.infants ? { infants: input.infants } : {}),
    sourcePostId: input.sourcePostId,
    items,
  };
}
