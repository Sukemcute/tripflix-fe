// Giỏ phòng phía client: chỉ là lựa chọn của khách, chưa giữ chỗ. Giá ở đây là tạm tính, server chốt khi giữ.

export const BOOKING_CART_MAX_ITEMS = 10;
export const BOOKING_CART_MAX_ROOMS = 9;

export interface BookingCartItem {
  productId: string;
  ratePlanCode: string;
  propertyId: string;
  propertyName: string;
  roomName: string;
  ratePlanName: string;
  checkIn: string;
  checkOut: string;
  maxGuests: number;
  /** Giá một phòng cho cả kỳ ở, VND. */
  stayPricePerRoom: number;
  maxQty: number;
  qty: number;
}

export interface BookingCartGuests {
  adults: number;
  children: number;
  infants: number;
}

export interface BookingCart extends BookingCartGuests {
  items: BookingCartItem[];
}

export type AddBookingCartOutcome = 'added' | 'adults_mismatch' | 'full';

export interface UnderCapacityStay {
  propertyName: string;
  capacity: number;
}

export const EMPTY_BOOKING_CART: BookingCart = { adults: 0, children: 0, infants: 0, items: [] };

const hasSameGuests = (first: BookingCartGuests, second: BookingCartGuests): boolean =>
  first.adults === second.adults && first.children === second.children && first.infants === second.infants;

export function getBookingCartItemKey(
  item: Pick<BookingCartItem, 'productId' | 'ratePlanCode' | 'checkIn' | 'checkOut'>,
): string {
  return [item.productId, item.ratePlanCode, item.checkIn, item.checkOut].join('|');
}

export function addBookingCartItem(
  cart: BookingCart,
  item: BookingCartItem,
  guests: BookingCartGuests,
): { cart: BookingCart; outcome: AddBookingCartOutcome } {
  if (cart.items.length > 0 && !hasSameGuests(cart, guests)) return { cart, outcome: 'adults_mismatch' };
  const key = getBookingCartItemKey(item);
  if (cart.items.some((line) => getBookingCartItemKey(line) === key)) return { cart, outcome: 'added' };
  if (cart.items.length >= BOOKING_CART_MAX_ITEMS) return { cart, outcome: 'full' };
  return { cart: { ...guests, items: [...cart.items, item] }, outcome: 'added' };
}

/** Số phòng về 0 thì bỏ mục khỏi giỏ. */
export function setBookingCartItemQty(cart: BookingCart, key: string, qty: number): BookingCart {
  const items = cart.items.flatMap((line) => {
    if (getBookingCartItemKey(line) !== key) return [line];
    return qty <= 0 ? [] : [{ ...line, qty: Math.min(qty, line.maxQty) }];
  });
  return items.length ? { ...cart, items } : EMPTY_BOOKING_CART;
}

/** Đưa phòng đang chọn vào giỏ; phòng đã có trong giỏ thì lấy số phòng mới. */
export function mergeBookingCart(
  cart: BookingCart,
  selection: BookingCart,
): { cart: BookingCart; outcome: AddBookingCartOutcome } {
  if (cart.items.length > 0 && !hasSameGuests(cart, selection)) {
    return { cart, outcome: 'adults_mismatch' };
  }
  const selectedKeys = new Set(selection.items.map(getBookingCartItemKey));
  const items = [...cart.items.filter((line) => !selectedKeys.has(getBookingCartItemKey(line))), ...selection.items];
  if (items.length > BOOKING_CART_MAX_ITEMS) return { cart, outcome: 'full' };
  return { cart: { adults: selection.adults, children: selection.children, infants: selection.infants, items }, outcome: 'added' };
}

export const countBookingCartGuests = (guests: BookingCartGuests): number => guests.adults + guests.children + guests.infants;

/** Cùng luật với server: người lớn, trẻ em, em bé đều chiếm một chỗ. */
export function countRoomsForGuests(input: BookingCartGuests & { maxGuests: number }): number {
  return Math.ceil(countBookingCartGuests(input) / input.maxGuests);
}

function groupBookingCartStays(cart: BookingCart): (UnderCapacityStay & { stayTotal: number; rooms: number })[] {
  const stays = new Map<string, UnderCapacityStay & { stayTotal: number; rooms: number }>();
  for (const line of cart.items) {
    const key = [line.propertyId, line.checkIn, line.checkOut].join('|');
    const stay = stays.get(key);
    stays.set(key, {
      propertyName: line.propertyName,
      capacity: (stay?.capacity ?? 0) + line.qty * line.maxGuests,
      stayTotal: (stay?.stayTotal ?? 0) + line.stayPricePerRoom * line.qty,
      rooms: (stay?.rooms ?? 0) + line.qty,
    });
  }
  return [...stays.values()];
}

/** Cùng công thức với server: trẻ em trả 1/3 suất người lớn nên giảm 2/3 suất, làm tròn 10.000đ. */
export function calculateChildStayDiscount(input: { stayTotal: number; capacity: number; children: number }): number {
  return Math.round((input.children * 2 * input.stayTotal) / (3 * input.capacity) / 10_000) * 10_000;
}

export function calculateBookingCartChildDiscount(cart: BookingCart): number {
  return groupBookingCartStays(cart).reduce(
    (sum, stay) => sum + calculateChildStayDiscount({ stayTotal: stay.stayTotal, capacity: stay.capacity, children: cart.children }),
    0,
  );
}

/** Tiền từng mục đã trừ giảm giá trẻ em, chia như server: theo tỷ lệ tiền từng mục của kỳ ở, mục cuối nhận phần lẻ. */
export function listBookingCartLineTotals(cart: BookingCart): number[] {
  const toStayKey = (line: BookingCartItem) => [line.propertyId, line.checkIn, line.checkOut].join('|');
  const stays = groupBookingCartStays(cart);
  const stayKeys = [...new Set(cart.items.map(toStayKey))];
  const remainingByKey = new Map<string, number>();
  const linesLeftByKey = new Map<string, number>();
  for (const line of cart.items) {
    const key = toStayKey(line);
    const stay = stays[stayKeys.indexOf(key)]!;
    remainingByKey.set(key, calculateChildStayDiscount({ stayTotal: stay.stayTotal, capacity: stay.capacity, children: cart.children }));
    linesLeftByKey.set(key, (linesLeftByKey.get(key) ?? 0) + 1);
  }
  return cart.items.map((line) => {
    const key = toStayKey(line);
    const stay = stays[stayKeys.indexOf(key)]!;
    const lineTotal = line.stayPricePerRoom * line.qty;
    const remaining = remainingByKey.get(key) ?? 0;
    const linesLeft = linesLeftByKey.get(key) ?? 1;
    const fullDiscount = calculateChildStayDiscount({ stayTotal: stay.stayTotal, capacity: stay.capacity, children: cart.children });
    const cut = linesLeft === 1 ? remaining : Math.round((fullDiscount * lineTotal) / stay.stayTotal);
    remainingByKey.set(key, remaining - cut);
    linesLeftByKey.set(key, linesLeft - 1);
    return lineTotal - cut;
  });
}

export function calculateBookingCartTotal(cart: BookingCart): number {
  const roomTotal = cart.items.reduce((sum, line) => sum + line.stayPricePerRoom * line.qty, 0);
  return roomTotal - calculateBookingCartChildDiscount(cart);
}

/** Cùng luật với server: mỗi khách sạn trong một kỳ ở phải đủ chỗ cho cả đoàn. */
export function findUnderCapacityStays(cart: BookingCart): UnderCapacityStay[] {
  const guests = countBookingCartGuests(cart);
  return groupBookingCartStays(cart)
    .filter((stay) => guests > stay.capacity || cart.adults < stay.rooms)
    .map(({ propertyName, capacity }) => ({ propertyName, capacity }));
}

export function createBookingCartRequest(cart: BookingCart) {
  return {
    adults: cart.adults,
    ...(cart.children > 0 ? { children: cart.children } : {}),
    ...(cart.infants > 0 ? { infants: cart.infants } : {}),
    items: cart.items.map((line) => ({
      productId: line.productId,
      checkIn: line.checkIn,
      checkOut: line.checkOut,
      qty: line.qty,
      ratePlanCode: line.ratePlanCode,
    })),
  };
}

const isCartItem = (value: unknown): value is BookingCartItem => {
  if (!value || typeof value !== 'object') return false;
  const line = value as Record<string, unknown>;
  return (
    ['productId', 'ratePlanCode', 'propertyId', 'propertyName', 'roomName', 'ratePlanName', 'checkIn', 'checkOut'].every(
      (field) => typeof line[field] === 'string',
    ) &&
    ['maxGuests', 'stayPricePerRoom', 'maxQty', 'qty'].every(
      (field) => typeof line[field] === 'number' && (line[field] as number) > 0,
    )
  );
};

/** Đọc giỏ đã lưu: dữ liệu hỏng thì coi như giỏ trống, mục đã qua ngày nhận phòng thì bỏ. */
export function parseBookingCart(raw: string | null, today: string): BookingCart {
  if (!raw) return EMPTY_BOOKING_CART;
  try {
    const parsed = JSON.parse(raw) as { adults?: unknown; children?: unknown; infants?: unknown; items?: unknown };
    if (typeof parsed.adults !== 'number' || !Array.isArray(parsed.items)) return EMPTY_BOOKING_CART;
    const items = parsed.items
      .filter(isCartItem)
      .filter((line) => line.checkIn >= today)
      .slice(0, BOOKING_CART_MAX_ITEMS);
    const children = typeof parsed.children === 'number' ? parsed.children : 0;
    const infants = typeof parsed.infants === 'number' ? parsed.infants : 0;
    return items.length ? { adults: parsed.adults, children, infants, items } : EMPTY_BOOKING_CART;
  } catch {
    return EMPTY_BOOKING_CART;
  }
}
