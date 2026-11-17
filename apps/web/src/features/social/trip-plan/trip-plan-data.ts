import type { TripAttachmentDto, TripItineraryItemDto } from '@tripflix/api-client/core-api/model/index';

export type TripDay = { day: number; items: TripItineraryItemDto[] };

/** "08:30" → 510 phút; không có giờ hoặc sai dạng thì null (giữ nguyên thứ tự tác giả nhập). */
function toMinutes(time: string | undefined): number | null {
  const match = time?.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes < 24 * 60 ? minutes : null;
}

/**
 * Lịch trình theo ngày, mỗi ngày sắp theo giờ. Điểm không có giờ đứng ở vị trí tác giả nhập so với các điểm không giờ
 * khác, sau các điểm có giờ cùng ngày (sắp ổn định để không đảo thứ tự tác giả đã sắp tay).
 */
export function groupTripDays(trip: Pick<TripAttachmentDto, 'items'> | null | undefined): TripDay[] {
  const byDay = new Map<number, { item: TripItineraryItemDto; order: number }[]>();
  (trip?.items ?? []).forEach((item, order) => {
    if (!Number.isInteger(item.day) || item.day < 1) return;
    byDay.set(item.day, [...(byDay.get(item.day) ?? []), { item, order }]);
  });
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, entries]) => ({
      day,
      items: entries
        .sort((a, b) => {
          const timeA = toMinutes(a.item.time);
          const timeB = toMinutes(b.item.time);
          if (timeA === null && timeB === null) return a.order - b.order;
          if (timeA === null) return 1;
          if (timeB === null) return -1;
          return timeA - timeB || a.order - b.order;
        })
        .map(({ item }) => item),
    }));
}

/** Số ngày của chuyến: lấy số lớn hơn giữa số ngày khai báo và ngày cuối có điểm dừng. */
export function getTripDayCount(trip: Pick<TripAttachmentDto, 'daysCount' | 'items'> | null | undefined): number {
  const lastDay = Math.max(0, ...(trip?.items ?? []).map((item) => item.day));
  return Math.max(trip?.daysCount ?? 0, lastDay);
}

/** Link Google Maps của một điểm: có toạ độ thì theo toạ độ, không thì tìm theo tên nơi kèm điểm đến của chuyến. */
export function buildPlaceMapUrl(place: { name?: string; destination?: string; lat?: number; lng?: number }): string | null {
  const base = 'https://www.google.com/maps/search/?api=1&query=';
  if (typeof place.lat === 'number' && typeof place.lng === 'number') return `${base}${place.lat},${place.lng}`;
  const name = place.name?.trim();
  if (!name) return null;
  const destination = place.destination?.trim();
  const query = destination && !name.toLowerCase().includes(destination.toLowerCase()) ? `${name}, ${destination}` : name;
  return base + encodeURIComponent(query);
}

/** Chặng bay hợp lệ (mã sân bay 3 chữ) hiện "HAN → CXR"; chặng khác chỉ hiện loại phương tiện. */
export function formatTransportRoute(transport: TripItineraryItemDto['transport']): string | null {
  if (!transport?.fromAirport || !transport.toAirport) return null;
  return `${transport.fromAirport} → ${transport.toAirport}`;
}
