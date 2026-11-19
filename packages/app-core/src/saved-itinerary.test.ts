import { describe, expect, it } from 'vitest';
import { groupItineraryDays, toTripAttachment } from './saved-itinerary';

describe('toTripAttachment', () => {
  it('lấy khách sạn đầu tiên làm khách sạn của chuyến, buổi của Tripi thành giờ đại diện', () => {
    const trip = toTripAttachment({
      id: 'it',
      title: 'Đà Nẵng 2 ngày',
      destinationName: 'Đà Nẵng',
      destinationPlaceId: null,
      daysCount: 2,
      items: [
        { day: 1, title: 'Vinpearl', hotel: { hotelId: 'H1', productId: 'R1' } },
        { day: 1, title: 'Chợ đêm', slot: 'tối' },
        { day: 2, title: 'Cà phê', time: '07:30', slot: 'sáng' },
      ],
    });
    expect(trip).toMatchObject({
      destinationName: 'Đà Nẵng',
      daysCount: 2,
      hotelId: 'H1',
      hotelProductId: 'R1',
    });
    expect(trip.items.map((i) => i.time)).toEqual([undefined, '19:00', '07:30']);
    expect(trip.items[1]).not.toHaveProperty('slot');
  });
});

describe('groupItineraryDays', () => {
  it('đủ Ngày 1..N kể cả ngày trống', () => {
    expect(groupItineraryDays(3, [{ day: 1 }, { day: 3 }]).map((d) => d.items.length)).toEqual([1, 0, 1]);
  });
});
