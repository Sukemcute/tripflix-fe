import { getBookingCartItemKey, type BookingCart, type BookingCartItem } from './booking-cart';

/** Phòng trong kết quả xem khách sạn, chỉ các trường cần để đối chiếu giỏ. */
export interface CartCheckRoomOffer {
  productId: string;
  isAvailable: boolean;
  /** Số phòng còn suốt kỳ ở; null khi không giới hạn hiển thị. */
  remaining: number | null;
  roomsNeeded: number;
  ratePlans: readonly { code: string; totalPrice: number | null }[];
}

/** Vấn đề của một mục trong giỏ so với tình trạng hiện tại. */
export type BookingCartLineIssue =
  | { kind: 'sold_out' }
  | { kind: 'not_enough'; remaining: number }
  | { kind: 'price_changed'; oldPrice: number; newPrice: number };

export interface BookingCartStayQuery {
  key: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
}

/** Mỗi khách sạn + kỳ ở chỉ cần gọi xem một lần dù giỏ có nhiều phòng ở đó. */
export function listBookingCartStayQueries(cart: BookingCart): BookingCartStayQuery[] {
  const queries = new Map<string, BookingCartStayQuery>();
  for (const line of cart.items) {
    const key = `${line.propertyId}|${line.checkIn}|${line.checkOut}`;
    if (!queries.has(key))
      queries.set(key, { key, propertyId: line.propertyId, checkIn: line.checkIn, checkOut: line.checkOut });
  }
  return [...queries.values()];
}

/** Giá một phòng cả kỳ ở, tính đúng như lúc thêm vào giỏ: tổng giá chia số phòng cần. */
export function calculateRoomStayPrice(room: CartCheckRoomOffer, ratePlanCode: string): number | null {
  const rate = room.ratePlans.find((plan) => plan.code === ratePlanCode);
  if (!rate || rate.totalPrice === null || room.roomsNeeded < 1) return null;
  return Math.round(rate.totalPrice / room.roomsNeeded);
}

/** Đối chiếu một mục với phòng hiện tại: hết phòng trước, rồi thiếu phòng, rồi đổi giá. */
export function checkBookingCartLine(
  line: BookingCartItem,
  rooms: readonly CartCheckRoomOffer[],
): BookingCartLineIssue | null {
  const room = rooms.find((offer) => offer.productId === line.productId);
  const price = room ? calculateRoomStayPrice(room, line.ratePlanCode) : null;
  if (!room || !room.isAvailable || price === null || room.remaining === 0) return { kind: 'sold_out' };
  if (room.remaining !== null && room.remaining < line.qty)
    return { kind: 'not_enough', remaining: room.remaining };
  if (price !== line.stayPricePerRoom)
    return { kind: 'price_changed', oldPrice: line.stayPricePerRoom, newPrice: price };
  return null;
}

export interface SoldOutConflict {
  productId: string;
  date: string;
}

/** Đọc lỗi 409 SOLD_OUT của POST /checkout: backend trả productId và ngày thiếu chỗ. */
export function readSoldOutConflict(body: unknown): SoldOutConflict | null {
  if (!body || typeof body !== 'object') return null;
  const { reason, productId, date } = body as { reason?: unknown; productId?: unknown; date?: unknown };
  if (reason !== 'SOLD_OUT' || typeof productId !== 'string' || typeof date !== 'string') return null;
  return { productId, date };
}

/** Các mục trong giỏ dính ngày hết chỗ: cùng loại phòng và ngày đó nằm trong kỳ ở (trả phòng không tính). */
export function findSoldOutLineKeys(cart: BookingCart, conflict: SoldOutConflict): string[] {
  return cart.items
    .filter(
      (line) =>
        line.productId === conflict.productId &&
        line.checkIn <= conflict.date &&
        conflict.date < line.checkOut,
    )
    .map(getBookingCartItemKey);
}

/** Nhận giá mới cho một mục (khách đồng ý giá hiện tại). */
export function setBookingCartItemPrice(
  cart: BookingCart,
  key: string,
  stayPricePerRoom: number,
): BookingCart {
  return {
    ...cart,
    items: cart.items.map((line) =>
      getBookingCartItemKey(line) === key ? { ...line, stayPricePerRoom } : line,
    ),
  };
}

/** Khoảng giá một đêm để gợi ý khách sạn thay thế cùng tầm tiền. */
export function getAlternativePriceRange(line: BookingCartItem): { priceMin: number; priceMax: number } {
  const nights = Math.max(1, Math.round((Date.parse(line.checkOut) - Date.parse(line.checkIn)) / 86_400_000));
  const perNight = line.stayPricePerRoom / nights;
  return { priceMin: Math.floor(perNight * 0.6), priceMax: Math.ceil(perNight * 1.4) };
}
