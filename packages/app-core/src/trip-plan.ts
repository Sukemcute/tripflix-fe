/** Phương tiện của một chặng trong lộ trình người đăng chia sẻ. */
export type TripPlanMode = 'flight' | 'bus' | 'train' | 'car' | 'other';

export interface TripPlanSegment {
  day: number;
  mode: TripPlanMode;
  fromCode?: string;
  toCode?: string;
  note?: string;
}

export interface TripPlanStay {
  hotelId: string;
  checkInDay: number;
  nights: number;
}

/** Bài có lộ trình để xem (có hoạt động, chặng đi hoặc chỗ ở) thì mới hiện nút "Xem lộ trình". */
export function hasTripPlan(
  trip: { items?: readonly unknown[]; segments?: readonly unknown[]; stays?: readonly unknown[] } | null | undefined,
): boolean {
  return !!trip && [trip.items, trip.segments, trip.stays].some((list) => (list?.length ?? 0) > 0);
}

/** Ngày thứ `day` (bắt đầu từ 1) của chuyến khởi hành ngày `startDate` (YYYY-MM-DD). */
export function getTripDayDate(startDate: string, day: number): string {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date.toISOString().slice(0, 10);
}

export interface TripPlanOffer {
  productId: string;
  ratePlanCode: string;
  totalPrice: number;
}

/**
 * Lựa chọn rẻ nhất còn bán của một phòng/chuyến bay: dùng chung cho phòng khách sạn (ratePlans) và vé bay (fares).
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
