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

/** Chặng bay đầu tiên của chuyến ("HAN → CXR") cho ô "Di chuyển"; không có chặng bay thì null. */
export function findFirstFlightRoute(trip: Pick<TripAttachmentDto, 'items'> | null | undefined): string | null {
  for (const item of trip?.items ?? []) {
    if (item.transport?.mode !== 'flight') continue;
    const route = formatTransportRoute(item.transport);
    if (route) return route;
  }
  return null;
}

/** Số điểm dừng không kể chặng di chuyển (đi lại không phải nơi để đến). */
export function countTripStops(trip: Pick<TripAttachmentDto, 'items'> | null | undefined): number {
  return (trip?.items ?? []).filter((item) => !item.transport).length;
}

/** Chuyến tương tự: bài khác có lịch trình, giữ thứ tự xếp hạng của discovery, tối đa `limit`. */
export function pickSimilarTrips<P extends { id: string; tripAttachment?: TripAttachmentDto | null }>(
  posts: readonly P[],
  currentPostId: string,
  limit = 3,
): P[] {
  return posts.filter((post) => post.id !== currentPostId && (post.tripAttachment?.items?.length ?? 0) > 0).slice(0, limit);
}

/** "Hoàng Nam Travel" → "Nam" cho dòng "Mẹo của Nam": lấy chữ cuối có nghĩa của tên, bỏ các chữ chung như Travel. */
export function getAuthorShortName(name: string | null | undefined): string | null {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const meaningful = words.filter((word) => !/^(travel|review|official|tour|blog|vlog|channel)$/i.test(word));
  return meaningful.at(-1) ?? words.at(-1) ?? null;
}

/**
 * Tiền phòng ước tính cho cả chuyến: giá từ (mỗi đêm, mỗi phòng) × số đêm của từng chặng ở. Chặng chưa có giá thì
 * không tính và trả về trong `missing` để màn hình ghi "chưa có giá" thay vì cộng thiếu mà không báo.
 */
export function estimateStayCost(
  stays: readonly { hotelId: string; nights: number }[],
  priceFromByHotel: ReadonlyMap<string, number | null | undefined>,
): { total: number; nights: number; missing: number } {
  let total = 0;
  let nights = 0;
  let missing = 0;
  for (const stay of stays) {
    const price = priceFromByHotel.get(stay.hotelId);
    nights += stay.nights;
    if (typeof price === 'number' && price > 0) total += price * stay.nights;
    else missing += 1;
  }
  return { total, nights, missing };
}

/** Các chặng bay hợp lệ của chuyến ("HAN → CXR"), theo thứ tự trong lịch trình. */
export function listFlightRoutes(trip: Pick<TripAttachmentDto, 'items'> | null | undefined): string[] {
  return (trip?.items ?? [])
    .filter((item) => item.transport?.mode === 'flight')
    .map((item) => formatTransportRoute(item.transport))
    .filter((route): route is string => route !== null);
}

/**
 * Ảnh nhỏ cho từng điểm dừng theo thứ tự hiện: dùng ảnh riêng của điểm nếu chưa điểm nào dùng; trùng hoặc không có
 * thì lấy ảnh chưa dùng trong bộ ảnh của chuyến; hết ảnh mới dùng lại ảnh riêng (thà trùng còn hơn ô trống).
 */
export function assignStopThumbnails(preferred: readonly (string | null | undefined)[], pool: readonly string[]): (string | null)[] {
  const used = new Set<string>();
  const takeFromPool = () => pool.find((src) => !used.has(src)) ?? null;
  return preferred.map((own) => {
    const pick = own && !used.has(own) ? own : (takeFromPool() ?? own ?? null);
    if (pick) used.add(pick);
    return pick;
  });
}

/**
 * Chèn chặng ở vào ngày nhận phòng giống sheet lộ trình ở feed: bài cũ chỉ có khách sạn ở cấp chuyến nên không có
 * điểm nào trong `items` mang `hotel`. Đặt sau các chặng di chuyển của ngày đó; ngày đã có điểm cùng khách sạn thì
 * bỏ qua để không hiện hai lần.
 */
export function addStayStops(
  days: readonly TripDay[],
  stays: readonly { day: number; nights: number; hotelId: string; hotelName?: string }[],
  describe: (stay: { nights: number }) => string,
  fallbackName?: string,
): TripDay[] {
  return days.map(({ day, items }) => {
    const missing = stays.filter(
      (stay) => stay.day === day && !items.some((item) => item.hotel?.hotelId === stay.hotelId),
    );
    if (missing.length === 0) return { day, items };
    const stops: TripItineraryItemDto[] = missing.map((stay) => ({
      day,
      title: stay.hotelName ?? fallbackName ?? stay.hotelId,
      location: describe(stay),
      hotel: { hotelId: stay.hotelId },
    }));
    const firstPlace = items.findIndex((item) => !item.transport);
    const at = firstPlace === -1 ? items.length : firstPlace;
    return { day, items: [...items.slice(0, at), ...stops, ...items.slice(at)] };
  });
}

/** Phần "HAN → DLI" đứng trước tiêu đề; tiêu đề đã ghi chặng đó ("Bay HAN → DLI") thì không lặp lại. */
export function getTransportPrefixRoute(title: string | undefined, route: string | null): string | null {
  if (!route) return null;
  const compact = (value: string) => value.replace(/\s+/g, '').toLowerCase();
  return title && compact(title).includes(compact(route)) ? null : route;
}
