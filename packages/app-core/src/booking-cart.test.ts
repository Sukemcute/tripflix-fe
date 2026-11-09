import { describe, expect, it } from 'vitest';
import {
  addBookingCartItem,
  calculateBookingCartChildDiscount,
  calculateBookingCartTotal,
  countRoomsForGuests,
  createBookingCartRequest,
  EMPTY_BOOKING_CART,
  findUnderCapacityStays,
  getBookingCartItemKey,
  listBookingCartLineTotals,
  mergeBookingCart,
  parseBookingCart,
  setBookingCartItemQty,
  type BookingCart,
  type BookingCartItem,
} from './booking-cart';

const room = (overrides: Partial<BookingCartItem> = {}): BookingCartItem => ({
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
  maxQty: 3,
  qty: 1,
  ...overrides,
});
const cartOf = (adults: number, ...items: BookingCartItem[]): BookingCart => ({ adults, children: 0, infants: 0, items });

describe('booking cart', () => {
  it('thêm được nhiều loại phòng và nhiều khách sạn', () => {
    const first = addBookingCartItem(EMPTY_BOOKING_CART, room(), { adults: 2, children: 0, infants: 0 }).cart;
    const second = addBookingCartItem(first, room({ productId: 'H2--STD', propertyId: 'H2' }), { adults: 2, children: 0, infants: 0 });
    expect(second.outcome).toBe('added');
    expect(second.cart.items).toHaveLength(2);
  });

  it('từ chối mục khác số khách và không thêm trùng', () => {
    const cart = cartOf(2, room());
    expect(addBookingCartItem(cart, room({ productId: 'X' }), { adults: 3, children: 0, infants: 0 }).outcome).toBe('adults_mismatch');
    expect(addBookingCartItem(cart, room(), { adults: 2, children: 0, infants: 0 }).cart.items).toHaveLength(1);
  });

  it('giới hạn 10 mục', () => {
    const items = Array.from({ length: 10 }, (_, index) => room({ productId: `P${index}` }));
    expect(addBookingCartItem(cartOf(2, ...items), room({ productId: 'P10' }), { adults: 2, children: 0, infants: 0 }).outcome).toBe('full');
  });

  it('chặn số phòng theo tồn và bỏ mục khi về 0', () => {
    const key = getBookingCartItemKey(room());
    expect(setBookingCartItemQty(cartOf(2, room()), key, 9).items[0]?.qty).toBe(3);
    expect(setBookingCartItemQty(cartOf(2, room()), key, 0)).toEqual(EMPTY_BOOKING_CART);
  });

  it('tính tạm tính và tạo request', () => {
    const cart = cartOf(2, room({ qty: 2 }), room({ productId: 'B', stayPricePerRoom: 500_000 }));
    expect(calculateBookingCartTotal(cart)).toBe(2_500_000);
    expect(createBookingCartRequest(cart).items[0]).toEqual({
      productId: 'H1--STD',
      checkIn: '2026-12-01',
      checkOut: '2026-12-03',
      qty: 2,
      ratePlanCode: 'RO',
    });
  });

  it('sức chứa gộp theo khách sạn, khách sạn khác tính riêng', () => {
    const suite = room({ productId: 'H1--SUI' });
    expect(findUnderCapacityStays(cartOf(4, room(), suite))).toEqual([]);
    const otherHotel = room({ productId: 'H2--STD', propertyId: 'H2', propertyName: 'Khách sạn 2' });
    expect(findUnderCapacityStays(cartOf(4, room(), suite, otherHotel))).toEqual([
      { propertyName: 'Khách sạn 2', capacity: 2 },
    ]);
  });

  it('trẻ em trả 1/3 suất, em bé miễn phí, ai cũng chiếm một chỗ, mỗi phòng cần một người lớn', () => {
    const cart = { adults: 2, children: 1, infants: 1, items: [room({ qty: 2, stayPricePerRoom: 3_000_000 })] };
    expect(findUnderCapacityStays(cart)).toEqual([]);
    expect(calculateBookingCartChildDiscount(cart)).toBe(1_000_000);
    expect(calculateBookingCartTotal(cart)).toBe(5_000_000);
    expect(createBookingCartRequest(cart)).toMatchObject({ children: 1, infants: 1 });
    expect(findUnderCapacityStays({ ...cart, items: [room({ qty: 1 })] })).toHaveLength(1);
    expect(findUnderCapacityStays({ adults: 1, children: 1, infants: 0, items: [room({ qty: 2 })] })).toHaveLength(1);
    expect(countRoomsForGuests({ adults: 2, children: 1, infants: 0, maxGuests: 3 })).toBe(1);
    expect(countRoomsForGuests({ adults: 2, children: 1, infants: 0, maxGuests: 2 })).toBe(2);
  });

  it('tiền từng mục chia giảm giá trẻ em theo tỷ lệ', () => {
    const cart = { adults: 2, children: 1, infants: 0, items: [room({ stayPricePerRoom: 3_000_000 }), room({ productId: 'B', stayPricePerRoom: 3_000_000 })] };
    expect(listBookingCartLineTotals(cart)).toEqual([2_500_000, 2_500_000]);
    expect(listBookingCartLineTotals(cart).reduce((sum, amount) => sum + amount, 0)).toBe(calculateBookingCartTotal(cart));
  });

  it('đưa phòng đang chọn vào giỏ: gộp mục mới, cập nhật mục trùng, chặn khác số khách', () => {
    const merged = mergeBookingCart(cartOf(2, room()), cartOf(2, room({ qty: 2 }), room({ productId: 'B' })));
    expect(merged.outcome).toBe('added');
    expect(merged.cart.items.map((line) => [line.productId, line.qty])).toEqual([['H1--STD', 2], ['B', 1]]);
    expect(mergeBookingCart(cartOf(2, room()), cartOf(3, room({ productId: 'B' }))).outcome).toBe('adults_mismatch');
  });

  it('đọc giỏ hỏng thành trống và bỏ mục quá hạn', () => {
    expect(parseBookingCart('{oops', '2026-11-09')).toEqual(EMPTY_BOOKING_CART);
    expect(parseBookingCart(JSON.stringify(cartOf(2, room())), '2026-12-02')).toEqual(EMPTY_BOOKING_CART);
    expect(parseBookingCart(JSON.stringify(cartOf(2, room())), '2026-11-09').items).toHaveLength(1);
  });
});
