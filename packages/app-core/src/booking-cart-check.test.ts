import { describe, expect, it } from 'vitest';
import {
  EMPTY_BOOKING_CART,
  getBookingCartItemKey,
  type BookingCart,
  type BookingCartItem,
} from './booking-cart';
import {
  checkBookingCartLine,
  findSoldOutLineKeys,
  getAlternativePriceRange,
  listBookingCartStayQueries,
  readSoldOutConflict,
  setBookingCartItemPrice,
  type CartCheckRoomOffer,
} from './booking-cart-check';

const line = (overrides: Partial<BookingCartItem> = {}): BookingCartItem => ({
  productId: 'H1--STD',
  ratePlanCode: 'RO',
  propertyId: 'H1',
  propertyName: 'Khách sạn 1',
  roomName: 'Tiêu chuẩn',
  ratePlanName: 'Chỉ phòng',
  checkIn: '2026-12-01',
  checkOut: '2026-12-03',
  maxGuests: 2,
  stayPricePerRoom: 1_000_000,
  maxQty: 9,
  qty: 2,
  ...overrides,
});
const offer = (overrides: Partial<CartCheckRoomOffer> = {}): CartCheckRoomOffer => ({
  productId: 'H1--STD',
  isAvailable: true,
  remaining: 5,
  roomsNeeded: 1,
  ratePlans: [{ code: 'RO', totalPrice: 1_000_000 }],
  ...overrides,
});
const cartOf = (...items: BookingCartItem[]): BookingCart => ({ ...EMPTY_BOOKING_CART, adults: 2, items });

describe('checkBookingCartLine', () => {
  it('không có vấn đề khi còn đủ phòng và giá không đổi', () => {
    expect(checkBookingCartLine(line(), [offer()])).toBeNull();
  });
  it.each([
    ['không còn loại phòng', []],
    ['phòng ngừng bán', [offer({ isAvailable: false })]],
    ['còn 0 phòng', [offer({ remaining: 0 })]],
    ['gói giá không còn', [offer({ ratePlans: [{ code: 'BB', totalPrice: 1 }] })]],
    ['gói giá không có giá', [offer({ ratePlans: [{ code: 'RO', totalPrice: null }] })]],
  ])('hết phòng khi %s', (_, rooms) => {
    expect(checkBookingCartLine(line(), rooms)).toEqual({ kind: 'sold_out' });
  });
  it('báo thiếu phòng khi còn ít hơn số đã chọn', () => {
    expect(checkBookingCartLine(line({ qty: 3 }), [offer({ remaining: 2 })])).toEqual({
      kind: 'not_enough',
      remaining: 2,
    });
  });
  it('remaining null thì không giới hạn số phòng', () => {
    expect(checkBookingCartLine(line({ qty: 9 }), [offer({ remaining: null })])).toBeNull();
  });
  it('báo đổi giá theo giá một phòng (tổng chia số phòng cần)', () => {
    const rooms = [offer({ roomsNeeded: 2, ratePlans: [{ code: 'RO', totalPrice: 2_400_001 }] })];
    expect(checkBookingCartLine(line(), rooms)).toEqual({
      kind: 'price_changed',
      oldPrice: 1_000_000,
      newPrice: 1_200_001,
    });
  });
});

describe('listBookingCartStayQueries', () => {
  it('gộp các phòng cùng khách sạn và kỳ ở thành một lần xem', () => {
    const cart = cartOf(
      line(),
      line({ productId: 'H1--DLX' }),
      line({ checkOut: '2026-12-04' }),
      line({ propertyId: 'H2' }),
    );
    expect(listBookingCartStayQueries(cart).map((query) => query.key)).toEqual([
      'H1|2026-12-01|2026-12-03',
      'H1|2026-12-01|2026-12-04',
      'H2|2026-12-01|2026-12-03',
    ]);
  });
});

describe('readSoldOutConflict', () => {
  it('đọc productId và ngày từ lỗi 409', () => {
    expect(
      readSoldOutConflict({
        message: 'x',
        errors: [],
        reason: 'SOLD_OUT',
        productId: 'H1--STD',
        date: '2026-12-02',
      }),
    ).toEqual({
      productId: 'H1--STD',
      date: '2026-12-02',
    });
  });
  it.each([
    null,
    'x',
    { reason: 'PRICE_CHANGED', productId: 'a', date: 'b' },
    { reason: 'SOLD_OUT', productId: 1, date: 'b' },
  ])('bỏ qua lỗi khác: %j', (body) => {
    expect(readSoldOutConflict(body)).toBeNull();
  });
});

describe('findSoldOutLineKeys', () => {
  it('chỉ chọn mục cùng loại phòng có ngày hết chỗ trong kỳ ở', () => {
    const hit = line();
    const otherRoom = line({ productId: 'H1--DLX' });
    const checkOutDay = line({ checkIn: '2026-11-30', checkOut: '2026-12-02', ratePlanCode: 'BB' });
    const cart = cartOf(hit, otherRoom, checkOutDay);
    expect(findSoldOutLineKeys(cart, { productId: 'H1--STD', date: '2026-12-02' })).toEqual([
      getBookingCartItemKey(hit),
    ]);
  });
});

describe('setBookingCartItemPrice', () => {
  it('chỉ đổi giá của đúng mục', () => {
    const other = line({ productId: 'H1--DLX' });
    const cart = setBookingCartItemPrice(cartOf(line(), other), getBookingCartItemKey(line()), 1_500_000);
    expect(cart.items.map((item) => item.stayPricePerRoom)).toEqual([1_500_000, 1_000_000]);
  });
});

describe('getAlternativePriceRange', () => {
  it('lấy giá một đêm ±40%', () => {
    expect(getAlternativePriceRange(line({ stayPricePerRoom: 2_000_000 }))).toEqual({
      priceMin: 600_000,
      priceMax: 1_400_000,
    });
  });
});
