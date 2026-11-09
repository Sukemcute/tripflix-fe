import { describe, expect, it } from 'vitest';
import { findCheckoutFieldErrors, findTravelDates } from './checkout-guests';

const TODAY = '2026-11-08';
const contact = { fullName: 'Lê Sukem', phone: '0918020202', email: 'a@b.vn' };
const travelDates = { first: '2026-11-08', last: '2026-11-11' };

describe('findCheckoutFieldErrors', () => {
  it('đủ và đúng thì không có lỗi', () => {
    expect(
      findCheckoutFieldErrors({
        contact,
        guests: [{ fullName: 'Lê Hoàng Tuấn', birthdate: '2000-05-01' }],
        passengerTypes: ['adult'],
        travelDates,
        today: TODAY,
      }),
    ).toEqual({});
  });

  it('người lớn sinh hôm nay báo sai tuổi người lớn ở đúng ô ngày sinh', () => {
    expect(
      findCheckoutFieldErrors({
        contact,
        guests: [{ fullName: 'Lê Hoàng Tuấn', birthdate: TODAY }],
        passengerTypes: ['adult'],
        travelDates,
        today: TODAY,
      }),
    ).toEqual({ 'guests[0].birthdate': 'adultAge' });
  });

  it('báo riêng từng ô liên hệ và hành khách', () => {
    expect(
      findCheckoutFieldErrors({
        contact: { fullName: ' ', phone: '12345', email: 'sai' },
        guests: [
          { fullName: '', birthdate: '' },
          { fullName: 'Bé', birthdate: '2030-01-01' },
        ],
        passengerTypes: ['adult', 'infant'],
        travelDates,
        today: TODAY,
      }),
    ).toEqual({
      'contact.fullName': 'required',
      'contact.phone': 'invalidPhone',
      'contact.email': 'invalidEmail',
      'guests[0].fullName': 'required',
      'guests[0].birthdate': 'required',
      'guests[1].birthdate': 'futureDate',
    });
  });

  it('trẻ em và em bé tính tuổi theo chặng đầu và chặng cuối', () => {
    const errors = findCheckoutFieldErrors({
      contact,
      guests: [
        { fullName: 'Trẻ 12 tuổi', birthdate: '2014-01-01' },
        { fullName: 'Bé lên 2 giữa chuyến', birthdate: '2024-11-10' },
      ],
      passengerTypes: ['child', 'infant'],
      travelDates,
      today: TODAY,
    });
    expect(errors).toEqual({ 'guests[0].birthdate': 'childAge', 'guests[1].birthdate': 'infantAge' });
  });
});

describe('findTravelDates', () => {
  it('lấy ngày bay sớm nhất và muộn nhất, bỏ qua phòng', () => {
    expect(
      findTravelDates([
        { productType: 'flight', date: '2026-11-11' },
        { productType: 'room', date: '2026-11-01' },
        { productType: 'flight', date: '2026-11-08' },
      ]),
    ).toEqual({ first: '2026-11-08', last: '2026-11-11' });
  });
});

describe('tuổi khách ở khách sạn', () => {
  const base = { contact: { fullName: 'A', phone: '0912345678', email: '' }, today: '2026-11-09', stayDate: '2026-12-01' };
  const check = (type: 'child' | 'infant', birthdate: string) =>
    findCheckoutFieldErrors({ ...base, guests: [{ fullName: 'B', birthdate }], passengerTypes: [type] });

  it('em bé dưới 4 tuổi, trẻ em từ 4 đến dưới 12 tuổi tại ngày nhận phòng', () => {
    expect(check('infant', '2023-01-01')).toEqual({});
    expect(check('infant', '2022-01-01')).toEqual({ 'guests[0].birthdate': 'infantRoomAge' });
    expect(check('child', '2022-01-01')).toEqual({});
    expect(check('child', '2023-01-01')).toEqual({ 'guests[0].birthdate': 'childRoomAge' });
    expect(check('child', '2014-01-01')).toEqual({ 'guests[0].birthdate': 'childRoomAge' });
  });
});
