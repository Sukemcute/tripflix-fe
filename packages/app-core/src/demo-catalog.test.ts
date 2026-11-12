import { describe, expect, it } from 'vitest';
import {
  getDemoAdminReturnPath,
  getDemoFeed,
  getDemoTrip,
  parseDemoSearch,
  searchDemoTrips,
} from './demo-catalog';

describe('mentor demo discovery', () => {
  it('understands Vietnamese destinations, decimal budgets and group size', () => {
    expect(parseDemoSearch('Đi Hội An 3 người, ngân sách 2,5 triệu/người')).toMatchObject({
      destination: 'hoi-an',
      budget: 2_500_000,
      guests: 3,
    });
    expect(searchDemoTrips('hoi an duoi 2500k').trips.map((trip) => trip.slug)).toEqual(['hoi-an']);
  });
  it('never substitutes a destination or exceeds the requested budget', () => {
    expect(searchDemoTrips('Nha Trang dưới 1 triệu').trips).toEqual([]);
    expect(searchDemoTrips('Đà Lạt dưới 5 triệu').trips).toEqual([]);
    expect(
      searchDemoTrips('chỉ đặt khách sạn Nha Trang dưới 2 triệu').trips.map((trip) => trip.slug),
    ).toEqual(['nha-trang-hotel']);
  });
  it('combines category and destination filters and sorts numerically', () => {
    expect(searchDemoTrips('Hội An', { category: 'sea' }).trips).toEqual([]);
    expect(searchDemoTrips('', { sort: 'price' }).trips.map((trip) => trip.pricePerGuest)).toEqual([
      1_490_000, 2_490_000, 2_790_000, 3_390_000,
    ]);
  });
  it('uses different feed ordering and resolves the exact detail item', () => {
    expect(getDemoFeed('for-you')[0]?.slug).toBe('nha-trang');
    expect(getDemoFeed('trending')[0]?.slug).toBe('hoi-an');
    for (const trip of getDemoFeed('trending')) expect(getDemoTrip(trip.slug)).toEqual(trip);
    expect(getDemoTrip('unknown')).toBeUndefined();
  });
  it('rejects external, protocol-relative and unsupported login destinations', () => {
    for (const path of [
      'https://example.com',
      '//example.com',
      '/login',
      '/orders?next=https://example.com',
      undefined,
    ])
      expect(getDemoAdminReturnPath(path)).toBe('/');
    expect(getDemoAdminReturnPath('/orders')).toBe('/orders');
    expect(getDemoAdminReturnPath('/moderation')).toBe('/moderation');
  });
});
