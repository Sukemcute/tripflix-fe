/** Phương tiện của một ngày trong lộ trình người đăng chia sẻ. */
export type TripPlanMode = 'flight' | 'bus' | 'train' | 'car' | 'other';
/** Loại điểm gợi ý (không đặt chỗ) để chọn icon: cà phê, ăn uống, vui chơi, khác (TF105). */
export type TripPlanCategory = 'cafe' | 'food' | 'fun' | 'other';
export const TRIP_PLAN_CATEGORIES: readonly TripPlanCategory[] = ['cafe', 'food', 'fun', 'other'];

/** Đoán loại theo tên gợi ý, cho bài đăng cũ chưa ghi loại. */
export function guessTripPlanCategory(title: string): TripPlanCategory {
  const text = title.toLowerCase();
  if (/cà phê|cafe|coffee/.test(text)) return 'cafe';
  // Ranh giới từ của regex JS không nhận chữ có dấu nên tách chữ "ăn" bằng khoảng trắng.
  if (/(^|\s)ăn(\s|$)|quán|nhà hàng|chợ|bún|phở|bánh|lẩu|hải sản/.test(text)) return 'food';
  if (/ghé|tham quan|check-in|lặn|tắm|chơi|công viên|bãi/.test(text)) return 'fun';
  return 'other';
}

/** Loại của một điểm gợi ý: dùng loại người đăng chọn, bài cũ chưa có thì đoán theo tên. */
export function getTripPlanCategory(item: {
  title: string;
  category?: TripPlanCategory | null;
}): TripPlanCategory {
  return item.category ?? guessTripPlanCategory(item.title);
}

interface TripPlanTransport {
  mode: TripPlanMode;
  fromAirport?: string;
  toAirport?: string;
}

/** Khách sạn gắn với một điểm của lộ trình; một chuyến có thể ở nhiều khách sạn (TF105). */
interface TripPlanItemHotel {
  hotelId: string;
  productId?: string;
  ratePlanCode?: string;
}

/**
 * Một điểm trong ngày lúc soạn lộ trình (TF105): hoạt động (mode null), chặng di chuyển, hoặc khách sạn
 * (kind 'hotel', chọn từ danh mục nên đặt được).
 * Thứ tự trong mảng là thứ tự người đăng sắp; giờ (HH:mm) tuỳ chọn.
 */
export interface TripPlanPointDraft {
  key: string;
  kind: 'activity' | 'hotel';
  /** Khách sạn trong danh mục khi kind là 'hotel'; rỗng khi chưa chọn. */
  hotelId: string;
  /** Loại phòng và gói giá người đăng chọn ở màn chọn phòng; rỗng khi chưa chọn. */
  productId: string;
  ratePlanCode: string;
  roomName: string;
  time: string;
  title: string;
  location: string;
  mode: TripPlanMode | null;
  /** Loại điểm gợi ý người đăng chọn; null khi chưa chọn (lúc đăng không gửi, app tự đoán theo tên). */
  category: TripPlanCategory | null;
  fromCode: string;
  toCode: string;
  note: string;
}

/** Một ngày trong trình soạn lộ trình lúc đăng bài. */
export interface TripPlanDayDraft {
  points: TripPlanPointDraft[];
}

export interface TripPlanDraft {
  destinationName: string;
  /** refId của điểm đến chọn từ ô tìm kiếm (/api/suggest); rỗng khi gõ tay. */
  destinationPlaceId: string;
  days: TripPlanDayDraft[];
  /** Ảnh poster riêng của lộ trình; null thì dùng poster video. */
  posterMediaId: string | null;
  /** Đơn đã đi dùng để dựng lộ trình; không hiện cho người xem. */
  bookingId: string | null;
  /** Chi phí ước tính mỗi người tác giả tự ghi; null khi không ghi. */
  estimatedCostPerPerson?: number | null;
  /**
   * Phần của bài cũ mà trình soạn không sửa (khách sạn ghi chung cả chuyến, lưu ý giá): giữ nguyên
   * để mở bản nháp ra rồi lưu lại không làm mất.
   */
  preserved?: TripPlanPreserved;
}

export interface TripPlanPreserved {
  hotelId?: string;
  hotelName?: string;
  hotelProductId?: string;
  hotelRatePlanCode?: string;
  priceDisclaimer?: string;
}

export const TRIP_PLAN_MAX_DAYS = 30;
export const TRIP_PLAN_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

let pointSeq = 0;
/** Điểm mới với khoá riêng để danh sách giữ đúng ô khi sắp lại. */
export function createTripPlanPoint(
  patch: Partial<Omit<TripPlanPointDraft, 'key'>> = {},
): TripPlanPointDraft {
  pointSeq += 1;
  return {
    key: `p${pointSeq}`,
    kind: 'activity',
    hotelId: '',
    productId: '',
    ratePlanCode: '',
    roomName: '',
    time: '',
    title: '',
    location: '',
    mode: null,
    category: null,
    fromCode: '',
    toCode: '',
    note: '',
    ...patch,
  };
}

export function createTripPlanDay(): TripPlanDayDraft {
  return { points: [createTripPlanPoint()] };
}

export function createTripPlanDraft(): TripPlanDraft {
  return {
    destinationName: '',
    destinationPlaceId: '',
    days: [createTripPlanDay()],
    posterMediaId: null,
    bookingId: null,
    estimatedCostPerPerson: null,
    preserved: {},
  };
}

/** Chuyển điểm trong một ngày sang vị trí khác; vị trí ngoài khoảng thì giữ nguyên. */
export function moveTripPlanPoint(day: TripPlanDayDraft, from: number, to: number): TripPlanDayDraft {
  if (from === to || from < 0 || to < 0 || from >= day.points.length || to >= day.points.length) return day;
  const points = [...day.points];
  const [moved] = points.splice(from, 1);
  points.splice(to, 0, moved!);
  return { points };
}

/** Sắp các điểm có giờ theo giờ; điểm chưa có giờ giữ chỗ cũ ở cuối. */
export function sortTripPlanPointsByTime(day: TripPlanDayDraft): TripPlanDayDraft {
  const timed = day.points.filter((point) => TRIP_PLAN_TIME_PATTERN.test(point.time));
  const untimed = day.points.filter((point) => !TRIP_PLAN_TIME_PATTERN.test(point.time));
  return { points: [...timed.sort((a, b) => a.time.localeCompare(b.time)), ...untimed] };
}

/** Khách sạn chọn từ danh mục và chặng bay có đủ mã sân bay thì đặt được; còn lại chỉ để tham khảo. */
export function isBookableTripPoint(point: TripPlanPointDraft): boolean {
  if (point.kind === 'hotel') return !!point.hotelId;
  return (
    point.mode === 'flight' &&
    /^[A-Z]{3}$/.test(point.fromCode) &&
    /^[A-Z]{3}$/.test(point.toCode) &&
    point.fromCode !== point.toCode
  );
}

/**
 * Dựng trip_attachment gửi lên khi đăng bài: mỗi điểm thành một mục theo đúng thứ tự,
 * chặng di chuyển kèm tuyến để tra vé, bỏ điểm trống.
 */
export function buildTripAttachment(
  draft: TripPlanDraft,
  modeLabels: Readonly<Record<TripPlanMode, string>>,
) {
  const items = draft.days.flatMap((day, index) =>
    day.points.flatMap(
      (
        point,
      ): {
        day: number;
        title: string;
        time?: string;
        location?: string;
        notes?: string;
        category?: TripPlanCategory;
        hotel?: TripPlanItemHotel;
        transport?: TripPlanTransport;
      }[] => {
        const time = TRIP_PLAN_TIME_PATTERN.test(point.time) ? { time: point.time } : {};
        const notes = point.note.trim() ? { notes: point.note.trim() } : {};
        const location = point.location.trim() ? { location: point.location.trim() } : {};
        if (point.mode && point.kind !== 'hotel') {
          const hasRoute = isBookableTripPoint(point);
          return [
            {
              day: index + 1,
              title:
                point.title.trim() ||
                (hasRoute
                  ? `${modeLabels[point.mode]} ${point.fromCode} → ${point.toCode}`
                  : modeLabels[point.mode]),
              ...time,
              ...location,
              ...notes,
              transport: {
                mode: point.mode,
                ...(hasRoute ? { fromAirport: point.fromCode, toAirport: point.toCode } : {}),
              },
            },
          ];
        }
        if (!point.title.trim()) return [];
        // Điểm khách sạn ghi loại phòng đã chọn để người xem biết; ghi chú riêng của người đăng được ưu tiên.
        const roomNote =
          point.kind === 'hotel' && !point.note.trim() && point.roomName ? { notes: point.roomName } : {};
        const hotel =
          point.kind === 'hotel' && point.hotelId
            ? {
                hotel: {
                  hotelId: point.hotelId,
                  ...(point.productId && point.ratePlanCode
                    ? { productId: point.productId, ratePlanCode: point.ratePlanCode }
                    : {}),
                },
              }
            : {};
        return [
          {
            day: index + 1,
            title: point.title.trim(),
            ...time,
            ...location,
            ...notes,
            ...roomNote,
            ...hotel,
            ...(point.kind !== 'hotel' && point.category ? { category: point.category } : {}),
          },
        ];
      },
    ),
  );
  // Mỗi điểm khách sạn mang khách sạn riêng; hotelId của chuyến giữ khách sạn đầu tiên cho bản cũ đọc (TF105).
  const hotel = draft.days
    .flatMap((day) => day.points)
    .find((point) => point.kind === 'hotel' && point.hotelId);
  const preserved = draft.preserved ?? {};
  const cost =
    draft.estimatedCostPerPerson && draft.estimatedCostPerPerson > 0
      ? { estimatedCostPerPerson: Math.round(draft.estimatedCostPerPerson) }
      : {};
  if (items.length === 0 && !hotel && !preserved.hotelId && !preserved.hotelName && !cost.estimatedCostPerPerson) {
    return null;
  }
  return {
    daysCount: draft.days.length,
    ...(draft.destinationName.trim() ? { destinationName: draft.destinationName.trim() } : {}),
    ...(draft.destinationPlaceId ? { destinationPlaceId: draft.destinationPlaceId } : {}),
    ...(hotel
      ? {
          hotelId: hotel.hotelId,
          hotelName: hotel.title.trim() || hotel.hotelId,
          ...(hotel.productId && hotel.ratePlanCode
            ? { hotelProductId: hotel.productId, hotelRatePlanCode: hotel.ratePlanCode }
            : {}),
        }
      : // Bài cũ ghi khách sạn chung cả chuyến (không có điểm khách sạn): giữ nguyên khi lưu lại.
        {
          ...(preserved.hotelId ? { hotelId: preserved.hotelId } : {}),
          ...(preserved.hotelName ? { hotelName: preserved.hotelName } : {}),
          ...(preserved.hotelProductId && preserved.hotelRatePlanCode
            ? { hotelProductId: preserved.hotelProductId, hotelRatePlanCode: preserved.hotelRatePlanCode }
            : {}),
        }),
    ...cost,
    ...(preserved.priceDisclaimer ? { priceDisclaimer: preserved.priceDisclaimer } : {}),
    ...(draft.posterMediaId ? { posterMediaId: draft.posterMediaId } : {}),
    ...(draft.bookingId ? { bookingId: draft.bookingId } : {}),
    items,
  };
}

/** Lộ trình đã lưu trong bài (trip_attachment), dạng đọc về từ API. */
export interface TripAttachmentSource {
  bookingId?: string | null;
  hotelId?: string | null;
  hotelName?: string | null;
  hotelProductId?: string | null;
  hotelRatePlanCode?: string | null;
  destinationName?: string | null;
  destinationPlaceId?: string | null;
  daysCount?: number | null;
  estimatedCostPerPerson?: number | null;
  priceDisclaimer?: string | null;
  posterMediaId?: string | null;
  items?: readonly {
    day: number;
    title: string;
    time?: string | null;
    location?: string | null;
    notes?: string | null;
    category?: TripPlanCategory | null;
    hotel?: { hotelId: string; productId?: string | null; ratePlanCode?: string | null } | null;
    transport?: { mode: TripPlanMode; fromAirport?: string | null; toAirport?: string | null } | null;
  }[];
}

/**
 * Dựng lại bản nháp từ lộ trình đã lưu, để mở bản nháp hay bài cũ ra sửa mà không mất giờ, khách sạn,
 * chặng bay, loại gợi ý. Lưu lại bằng buildTripAttachment với cùng modeLabels cho ra đúng dữ liệu cũ.
 */
export function buildTripDraftFromAttachment(
  attachment: TripAttachmentSource | null | undefined,
  modeLabels: Readonly<Record<TripPlanMode, string>>,
): TripPlanDraft {
  const draft = createTripPlanDraft();
  if (!attachment) return draft;
  const items = attachment.items ?? [];
  const dayCount = Math.min(
    Math.max(attachment.daysCount ?? 0, ...items.map((item) => item.day), 1),
    TRIP_PLAN_MAX_DAYS,
  );
  const days: TripPlanDayDraft[] = Array.from({ length: dayCount }, () => ({ points: [] }));
  for (const item of items) {
    const index = Math.min(Math.max(Math.trunc(item.day) - 1, 0), dayCount - 1);
    const common = {
      time: item.time ?? '',
      location: item.location ?? '',
      note: item.notes ?? '',
    };
    if (item.hotel?.hotelId) {
      days[index]!.points.push(
        createTripPlanPoint({
          ...common,
          kind: 'hotel',
          hotelId: item.hotel.hotelId,
          productId: item.hotel.productId ?? '',
          ratePlanCode: item.hotel.ratePlanCode ?? '',
          title: item.title,
        }),
      );
      continue;
    }
    if (item.transport) {
      const { mode } = item.transport;
      const fromCode = item.transport.fromAirport ?? '';
      const toCode = item.transport.toAirport ?? '';
      // Tên chặng tự sinh lúc đăng (VD "Máy bay SGN → PQC") thì để trống, giống lúc người đăng chưa đặt tên.
      const autoTitle = fromCode && toCode ? `${modeLabels[mode]} ${fromCode} → ${toCode}` : modeLabels[mode];
      days[index]!.points.push(
        createTripPlanPoint({
          ...common,
          mode,
          fromCode,
          toCode,
          title: item.title === autoTitle ? '' : item.title,
        }),
      );
      continue;
    }
    days[index]!.points.push(
      createTripPlanPoint({ ...common, title: item.title, category: item.category ?? null }),
    );
  }
  for (const day of days) if (day.points.length === 0) day.points.push(createTripPlanPoint());
  const hasHotelPoint = items.some((item) => item.hotel?.hotelId);
  return {
    destinationName: attachment.destinationName ?? '',
    destinationPlaceId: attachment.destinationPlaceId ?? '',
    days,
    posterMediaId: attachment.posterMediaId ?? null,
    bookingId: attachment.bookingId ?? null,
    estimatedCostPerPerson: attachment.estimatedCostPerPerson ?? null,
    preserved: {
      ...(!hasHotelPoint && attachment.hotelId ? { hotelId: attachment.hotelId } : {}),
      ...(!hasHotelPoint && attachment.hotelName ? { hotelName: attachment.hotelName } : {}),
      ...(!hasHotelPoint && attachment.hotelProductId ? { hotelProductId: attachment.hotelProductId } : {}),
      ...(!hasHotelPoint && attachment.hotelRatePlanCode
        ? { hotelRatePlanCode: attachment.hotelRatePlanCode }
        : {}),
      ...(attachment.priceDisclaimer ? { priceDisclaimer: attachment.priceDisclaimer } : {}),
    },
  };
}

/** Một mục của đơn đã đặt, đủ để dựng lộ trình (lấy từ GET /checkout). */
export interface TripOrderItemSource {
  productType: string;
  productId?: string;
  productName: string;
  ratePlanCode?: string;
  propertyId?: string | null;
  propertyName?: string | null;
  fromAirport?: string | null;
  toAirport?: string | null;
  date: string;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Dựng bản nháp lộ trình từ chuyến đã đi (TF105): vé bay thành chặng bay đúng ngày, khách sạn đầu tiên
 * thành chỗ ở. Người đăng chỉnh tiếp trước khi đăng.
 */
export function buildTripDraftFromOrder(order: {
  orderId: string;
  startDate: string | null;
  endDate: string | null;
  items: readonly TripOrderItemSource[];
}): TripPlanDraft {
  const startDate = order.startDate ?? order.items.map((item) => item.date).sort()[0] ?? null;
  const span = startDate && order.endDate ? daysBetween(startDate, order.endDate) + 1 : 1;
  const dayCount = Math.min(Math.max(span, 1), TRIP_PLAN_MAX_DAYS);
  const days: TripPlanDayDraft[] = Array.from({ length: dayCount }, () => ({ points: [] }));
  for (const item of order.items) {
    if (item.productType !== 'flight' || !item.fromAirport || !item.toAirport || !startDate) continue;
    const index = Math.min(Math.max(daysBetween(startDate, item.date), 0), dayCount - 1);
    days[index]!.points.push(
      createTripPlanPoint({ mode: 'flight', fromCode: item.fromAirport, toCode: item.toAirport }),
    );
  }
  // Mỗi khách sạn của đơn thành điểm nhận phòng đúng ngày, để người xem thấy chỗ ở trong lịch từng ngày.
  const rooms = order.items.filter((item) => item.productType === 'room' && item.propertyId);
  for (const room of rooms) {
    if (!startDate) break;
    const index = Math.min(Math.max(daysBetween(startDate, room.date), 0), dayCount - 1);
    days[index]!.points.push(
      createTripPlanPoint({
        kind: 'hotel',
        hotelId: room.propertyId!,
        title: room.propertyName ?? room.productName,
        productId: room.productId ?? '',
        ratePlanCode: room.ratePlanCode ?? '',
        roomName: room.productName,
        time: '14:00',
      }),
    );
  }
  for (const day of days) if (day.points.length === 0) day.points.push(createTripPlanPoint());
  return {
    destinationName: '',
    destinationPlaceId: '',
    days,
    posterMediaId: null,
    bookingId: order.orderId,
    estimatedCostPerPerson: null,
    preserved: {},
  };
}

interface TripPlanFlight {
  day: number;
  from: string;
  to: string;
}

/**
 * Một chặng ở của lộ trình: nhận phòng ngày `day`, ở `nights` đêm tới khi sang khách sạn kế tiếp
 * hoặc hết chuyến. `id` dùng làm khoá chọn phòng và đổi khách sạn trên màn đặt.
 */
export interface TripPlanStay {
  id: string;
  day: number;
  nights: number;
  hotelId: string;
  hotelName?: string;
  productId?: string;
  ratePlanCode?: string;
}

/**
 * Các chặng ở theo thứ tự ngày (TF105). Điểm khách sạn liền nhau cùng một khách sạn gộp thành một chặng.
 * Bài cũ chỉ có hotelId của chuyến thì là một chặng từ ngày 1 tới hết chuyến.
 */
export function getTripPlanStays(trip: {
  hotelId?: string;
  hotelName?: string;
  hotelProductId?: string;
  hotelRatePlanCode?: string;
  daysCount?: number;
  items?: readonly { day: number; title?: string; hotel?: TripPlanItemHotel }[];
}): TripPlanStay[] {
  const items = trip.items ?? [];
  const days = Math.min(
    Math.max(trip.daysCount ?? 0, ...items.map((item) => item.day), 1),
    TRIP_PLAN_MAX_DAYS,
  );
  const points = items
    .filter(
      (item) =>
        typeof item.hotel?.hotelId === 'string' &&
        !!item.hotel.hotelId &&
        Number.isInteger(item.day) &&
        item.day >= 1 &&
        item.day <= days,
    )
    .map((item) => ({ day: item.day, title: item.title, hotel: item.hotel! }))
    .sort((a, b) => a.day - b.day);
  const stays: Omit<TripPlanStay, 'id' | 'nights'>[] = [];
  for (const { day, title, hotel } of points) {
    const last = stays.at(-1);
    if (last?.hotelId === hotel.hotelId) continue;
    // Hai khách sạn cùng ngày: lấy khách sạn sau cùng của ngày đó làm chỗ ngủ đêm ấy.
    if (last?.day === day) stays.pop();
    stays.push({
      day,
      hotelId: hotel.hotelId,
      ...(title ? { hotelName: title } : {}),
      ...(hotel.productId && hotel.ratePlanCode
        ? { productId: hotel.productId, ratePlanCode: hotel.ratePlanCode }
        : {}),
    });
  }
  if (stays.length === 0 && trip.hotelId) {
    stays.push({
      day: 1,
      hotelId: trip.hotelId,
      ...(trip.hotelName ? { hotelName: trip.hotelName } : {}),
      ...(trip.hotelProductId && trip.hotelRatePlanCode
        ? { productId: trip.hotelProductId, ratePlanCode: trip.hotelRatePlanCode }
        : {}),
    });
  }
  return stays.map((stay, index) => {
    const next = stays[index + 1];
    // Ở tới sáng ngày cuối của chuyến, ít nhất một đêm.
    const nights = Math.max(1, (next ? next.day : days) - stay.day);
    return { ...stay, id: 'hotel' + index, nights };
  });
}

/** Tách dịch vụ bán được và các chặng người xem tự thu xếp. */
export function getBookableTripPlan(trip: {
  hotelId?: string;
  hotelName?: string;
  hotelProductId?: string;
  hotelRatePlanCode?: string;
  daysCount?: number;
  items?: readonly {
    day: number;
    title?: string;
    hotel?: TripPlanItemHotel;
    transport?: TripPlanTransport;
  }[];
}): {
  hotels: TripPlanStay[];
  flights: TripPlanFlight[];
  selfArranged: { day: number; title?: string; mode: TripPlanMode }[];
} | null {
  const airportCode = /^[A-Z]{3}$/;
  const flights: TripPlanFlight[] = [];
  const selfArranged: { day: number; title?: string; mode: TripPlanMode }[] = [];
  for (const { day, title, transport } of trip.items ?? []) {
    if (!transport) continue;
    const { mode, fromAirport, toAirport } = transport;
    if (
      mode !== 'flight' ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > TRIP_PLAN_MAX_DAYS ||
      typeof fromAirport !== 'string' ||
      typeof toAirport !== 'string' ||
      !airportCode.test(fromAirport) ||
      !airportCode.test(toAirport) ||
      fromAirport === toAirport
    ) {
      selfArranged.push({ day, ...(title !== undefined ? { title } : {}), mode });
    } else {
      flights.push({ day, from: fromAirport, to: toAirport });
    }
  }
  const hotels = getTripPlanStays(trip);
  const count = hotels.length + flights.length;
  if (count === 0 || count > TRIP_PLAN_MAX_ITEMS) return null;
  return { hotels, flights: flights.sort((a, b) => a.day - b.day), selfArranged };
}

/** Bài có lộ trình để xem (có lịch từng ngày hoặc chỗ ở) thì mới hiện nút "Xem lộ trình". */
export function hasTripPlan(
  trip: { items?: readonly unknown[]; hotelId?: string | null } | null | undefined,
): boolean {
  return !!trip && ((trip.items?.length ?? 0) > 0 || !!trip.hotelId);
}

/** Ngày thứ `day` (bắt đầu từ 1) của chuyến khởi hành ngày `startDate` (YYYY-MM-DD). */
export function getTripDayDate(startDate: string, day: number): string {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date.toISOString().slice(0, 10);
}

/** Số đêm ở khách sạn của lộ trình `days` ngày: ở tới sáng ngày cuối, ít nhất một đêm. */
export function getTripNights(days: number): number {
  return Math.max(1, days - 1);
}

export interface TripPlanOffer {
  productId: string;
  ratePlanCode: string;
  totalPrice: number;
}

/**
 * Lựa chọn rẻ nhất còn bán: dùng cho phòng khách sạn (ratePlans) và vé bay (fares).
 * Không còn lựa chọn nào có giá thì trả null để màn hình báo hết chỗ.
 */
export function pickCheapestOffer(
  offers: readonly {
    productId: string;
    isAvailable: boolean;
    plans: readonly { code: string; totalPrice: number | null }[];
  }[],
): TripPlanOffer | null {
  return listTripPlanOffers(offers)[0] ?? null;
}

/** Liệt kê giá còn bán theo thứ tự tăng dần, giữ nguyên dữ liệu máy chủ. */
export function listTripPlanOffers(
  offers: readonly {
    productId: string;
    isAvailable: boolean;
    plans: readonly { code: string; totalPrice: number | null }[];
  }[],
): TripPlanOffer[] {
  return offers
    .flatMap((offer) =>
      offer.isAvailable
        ? offer.plans.flatMap((plan) =>
            plan.totalPrice !== null && Number.isFinite(plan.totalPrice) && plan.totalPrice >= 0
              ? [{ productId: offer.productId, ratePlanCode: plan.code, totalPrice: plan.totalPrice }]
              : [],
          )
        : [],
    )
    .sort((a, b) => a.totalPrice - b.totalPrice);
}

/** Chỉ cộng giá các mục được chọn và còn báo giá. */
export function getTripPlanTotal(
  items: readonly { isSelected: boolean; offer: TripPlanOffer | null }[],
): number {
  return items.reduce((sum, item) => sum + (item.isSelected ? (item.offer?.totalPrice ?? 0) : 0), 0);
}

/** Giới hạn ghế do bên gọi truyền vào để dùng chung quy tắc vé bay. */
export function isValidTripPlanPassengers(
  passengers: { adults: number; children: number; infants: number },
  maxSeats: number,
): boolean {
  const { adults, children, infants } = passengers;
  return (
    [adults, children, infants].every((count) => Number.isInteger(count) && count >= 0) &&
    adults >= 1 &&
    adults + children <= maxSeats &&
    infants <= adults
  );
}

export interface TripPlanCheckoutInput {
  adults: number;
  children?: number;
  infants?: number;
  /** Bài đăng dẫn tới đơn (Đặt y chang); bỏ trống khi khách tự lên lộ trình. */
  sourcePostId?: string;
  flights: readonly { productId: string; ratePlanCode: string; date: string }[];
  rooms: readonly { productId: string; ratePlanCode: string; checkIn: string; checkOut: string }[];
}

/** Giới hạn mục mỗi đơn của core (POST /checkout). */
export const TRIP_PLAN_MAX_ITEMS = 10;

/** Một đơn gồm mọi vé bay và phòng của lộ trình, ghi bài nguồn để tính "Đặt y chang". */
export function buildTripPlanCheckout(input: TripPlanCheckoutInput) {
  const items = [
    ...input.flights.map((flight) => ({
      productId: flight.productId,
      checkIn: flight.date,
      ratePlanCode: flight.ratePlanCode,
    })),
    ...input.rooms.map((room) => ({
      productId: room.productId,
      checkIn: room.checkIn,
      checkOut: room.checkOut,
      ratePlanCode: room.ratePlanCode,
    })),
  ];
  if (items.length === 0) throw new Error('Trip plan has nothing to book');
  if (items.length > TRIP_PLAN_MAX_ITEMS) throw new Error('Trip plan has too many items for one order');
  const hasFlights = input.flights.length > 0;
  // Core chỉ nhận trẻ em, em bé khi đơn có vé bay.
  return {
    adults: input.adults,
    ...(hasFlights && input.children ? { children: input.children } : {}),
    ...(hasFlights && input.infants ? { infants: input.infants } : {}),
    ...(input.sourcePostId ? { sourcePostId: input.sourcePostId } : {}),
    items,
  };
}

/**
 * Người xem bay từ nơi khác: thay sân bay nhà của người đăng (điểm đi của chặng đầu) ở cả chiều đi lẫn chiều về.
 * Đổi khách sạn của chặng ở nào thì thay khách sạn chặng đó và bỏ loại phòng người đăng chọn.
 */
export function applyTripPlanChoices(
  plan: { hotels: readonly TripPlanStay[]; flights: readonly TripPlanFlight[] },
  choices: { homeAirport?: string; hotels?: Readonly<Record<string, { id: string; name: string }>> },
): { hotels: TripPlanStay[]; flights: TripPlanFlight[] } {
  const originalHome = plan.flights[0]?.from;
  const home = choices.homeAirport;
  const swap = (code: string) => (home && code === originalHome ? home : code);
  return {
    hotels: plan.hotels.map((stay) => {
      const swapped = choices.hotels?.[stay.id];
      return swapped
        ? { id: stay.id, day: stay.day, nights: stay.nights, hotelId: swapped.id, hotelName: swapped.name }
        : stay;
    }),
    flights: plan.flights.map((leg) => ({ ...leg, from: swap(leg.from), to: swap(leg.to) })),
  };
}

/** Chỉ giữ mã giá của đúng bộ lọc; luôn lấy giá và mô tả mới từ báo giá hiện tại đã xếp tăng dần. */
export function resolveTripPlanOffer<T extends TripPlanOffer>(
  offers: readonly T[],
  picks: { key: string; values: Readonly<Record<string, TripPlanOffer>> },
  selectionKey: string,
  id: string,
  preferred?: { productId?: string; ratePlanCode?: string },
): T | null {
  const saved = picks.key === selectionKey ? picks.values[id] : undefined;
  const match = (target?: { productId?: string; ratePlanCode?: string }) =>
    target?.productId
      ? offers.find(
          (offer) => offer.productId === target.productId && offer.ratePlanCode === target.ratePlanCode,
        )
      : undefined;
  return match(saved) ?? match(preferred) ?? offers[0] ?? null;
}

const normalizePlaceName = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

/** Chặng bay chiều đi: chặng bay đầu tiên đã chọn đủ sân bay đi và đến. */
export function findTripOutboundFlight(draft: TripPlanDraft): { from: string; to: string } | null {
  const point = draft.days
    .flatMap((day) => day.points)
    .find((item) => item.kind !== 'hotel' && item.mode === 'flight' && item.fromCode && item.toCode);
  return point ? { from: point.fromCode, to: point.toCode } : null;
}

/**
 * Sân bay đến mặc định khi chọn sân bay đi (TF105): chiều về (bay từ nơi đến của chiều đi) thì về lại sân bay
 * nhà; còn lại lấy sân bay có tên khớp điểm đến của chuyến. Không khớp thì để người dùng tự chọn.
 */
export function pickTripFlightDestination(input: {
  from: string;
  destinations: readonly { code: string; name: string }[];
  destinationName: string;
  outbound: { from: string; to: string } | null;
}): string {
  const { from, destinations, outbound } = input;
  if (outbound && from === outbound.to && destinations.some((item) => item.code === outbound.from))
    return outbound.from;
  const target = normalizePlaceName(input.destinationName);
  if (!target) return '';
  const match = destinations.find((item) => {
    const name = normalizePlaceName(item.name);
    return !!name && (name.includes(target) || target.includes(name));
  });
  return match?.code ?? '';
}

/**
 * Sân bay của một nơi (Hà Nội → HAN) từ danh sách tuyến bay: lấy sân bay đến có tên khớp tên nơi, không phân biệt dấu.
 * Không khớp thì null để người dùng tự chọn. Dùng cho tự lên lộ trình (TF105).
 */
export function findPlaceAirport(
  routes: readonly { destinations: readonly { code: string; name: string }[] }[],
  placeName: string,
): string | null {
  const target = normalizePlaceName(placeName);
  if (!target) return null;
  for (const route of routes) {
    for (const destination of route.destinations) {
      const name = normalizePlaceName(destination.name);
      if (name && (name.includes(target) || target.includes(name))) return destination.code;
    }
  }
  return null;
}

/**
 * Chặng bay tới một nơi gõ bằng tên (ô tìm vé ở Khám phá): sân bay đến khớp tên, sân bay đi là nơi có nhiều chuyến
 * nhất tới đó để màn vé đủ điểm đi, điểm đến mà không bắt nhập lại. Không khớp thì null.
 */
export function findPlaceFlightRoute(
  routes: readonly {
    airport: string;
    destinations: readonly { code: string; name: string; flightCount?: number }[];
  }[],
  placeName: string,
): { from: string; to: string } | null {
  const to = findPlaceAirport(routes, placeName);
  if (!to) return null;
  let best: { from: string; count: number } | null = null;
  for (const route of routes) {
    const destination = route.destinations.find((item) => item.code === to);
    if (!destination || route.airport === to) continue;
    const count = destination.flightCount ?? 0;
    if (!best || count > best.count) best = { from: route.airport, count };
  }
  return best ? { from: best.from, to } : null;
}

/**
 * Chặng của chuyến bay sắp thêm khi tự lên lộ trình (TF105). Đã có chiều đi tới nơi đến mà chưa có chiều về thì là chiều
 * về (bay ngày trả phòng cuối, không có khách sạn thì sau chiều đi 2 ngày); còn lại là chiều đi từ nhà tới nơi đến,
 * bay ngày nhận phòng đầu. Nơi đến chưa có sân bay thì để trống để người dùng tự chọn.
 */
export function planNextTripFlight(input: {
  flights: readonly { from: string; to: string; date: string }[];
  hotels: readonly { checkIn: string; nights: number }[];
  placeAirport: string | null;
  defaultHome: string;
  defaultDate: string;
}): { leg: 'outbound' | 'inbound'; from: string; to: string; date: string } {
  const { flights, placeAirport } = input;
  const hotels = [...input.hotels].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const outbound = placeAirport ? flights.find((flight) => flight.to === placeAirport) : undefined;
  const hasReturn = !!placeAirport && flights.some((flight) => flight.from === placeAirport);
  if (outbound && !hasReturn) {
    const lastHotel = hotels.at(-1);
    return {
      leg: 'inbound',
      from: outbound.to,
      to: outbound.from,
      date: lastHotel
        ? getTripDayDate(lastHotel.checkIn, lastHotel.nights + 1)
        : getTripDayDate(outbound.date, 3),
    };
  }
  return {
    leg: 'outbound',
    from: flights[0]?.from ?? input.defaultHome,
    to: placeAirport ?? '',
    date: hotels[0]?.checkIn ?? input.defaultDate,
  };
}
