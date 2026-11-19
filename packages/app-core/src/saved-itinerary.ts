/** Phần lộ trình đã lưu cần để đặt (TF105): cùng dạng lộ trình của reel nên dùng lại luồng "Đặt lộ trình này". */
export interface SavedItineraryLike {
  id: string;
  title: string;
  destinationName: string | null;
  destinationPlaceId: string | null;
  daysCount: number;
  items: readonly {
    day: number;
    title: string;
    location?: string;
    notes?: string;
    time?: string;
    category?: 'cafe' | 'food' | 'fun' | 'other';
    hotel?: { hotelId: string; productId?: string; ratePlanCode?: string };
    transport?: {
      mode: 'flight' | 'bus' | 'train' | 'car' | 'other';
      fromAirport?: string;
      toAirport?: string;
    };
    slot?: 'sáng' | 'trưa' | 'chiều' | 'tối';
  }[];
}

const SLOT_TIMES = { sáng: '08:00', trưa: '12:00', chiều: '15:00', tối: '19:00' } as const;

/**
 * Đổi lộ trình đã lưu thành lộ trình đính kèm như của reel: khách chọn ngày khởi hành ở tab Đặt rồi Ngày N mới thành
 * ngày thật. Điểm chỉ có buổi (Tripi) lấy giờ đại diện của buổi để xếp và hiện trên lịch.
 */
export function toTripAttachment(itinerary: SavedItineraryLike) {
  const firstHotel = itinerary.items.find((item) => item.hotel)?.hotel;
  return {
    destinationName: itinerary.destinationName ?? itinerary.title,
    ...(itinerary.destinationPlaceId && { destinationPlaceId: itinerary.destinationPlaceId }),
    daysCount: itinerary.daysCount,
    ...(firstHotel && {
      hotelId: firstHotel.hotelId,
      ...(firstHotel.productId && { hotelProductId: firstHotel.productId }),
      ...(firstHotel.ratePlanCode && { hotelRatePlanCode: firstHotel.ratePlanCode }),
    }),
    items: itinerary.items.map(({ slot, ...item }) => ({
      ...item,
      ...(!item.time && slot && { time: SLOT_TIMES[slot] }),
    })),
  };
}

/** Nhóm điểm theo Ngày 1..N để hiện; ngày trống vẫn có (khách tự thêm ngày nghỉ). */
export function groupItineraryDays<T extends { day: number }>(
  daysCount: number,
  items: readonly T[],
): { day: number; items: T[] }[] {
  const lastDay = Math.max(daysCount, ...items.map((item) => item.day), 1);
  return Array.from({ length: lastDay }, (_, index) => ({
    day: index + 1,
    items: items.filter((item) => item.day === index + 1),
  }));
}
