/** Cách xếp kết quả vé máy bay, giống trang vé trên web. */
export type FlightSort = 'recommended' | 'price' | 'departure' | 'duration';

interface FlightTimes {
  departTime: string | null;
  arriveTime?: string | null;
  durationMinutes?: number | null;
}
interface FlightCabinOffer extends FlightTimes {
  isAvailable: boolean;
  priceFrom: number | null;
}

function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Số phút bay: ưu tiên số BE trả, thiếu thì tính từ giờ đi, giờ đến (qua nửa đêm thì cộng một ngày). */
export function getFlightDurationMinutes(flight: FlightTimes): number | null {
  if (flight.durationMinutes != null) return flight.durationMinutes;
  if (!flight.departTime || !flight.arriveTime) return null;
  return (toMinutes(flight.arriveTime) - toMinutes(flight.departTime) + 24 * 60) % (24 * 60);
}

/** Giá thấp nhất còn bán của một chuyến (các hạng ghế); hết chỗ thì null. */
export function getFlightLowestPrice(cabins: readonly FlightCabinOffer[]): number | null {
  const prices = cabins.flatMap((cabin) =>
    cabin.isAvailable && cabin.priceFrom != null ? [cabin.priceFrom] : [],
  );
  return prices.length ? Math.min(...prices) : null;
}

/** Xếp các chuyến (mỗi chuyến là danh sách hạng ghế); "đề xuất" giữ thứ tự BE trả. Chuyến hết chỗ luôn xuống cuối. */
export function sortFlightGroups<T extends FlightCabinOffer>(
  groups: readonly T[][],
  sort: FlightSort,
): T[][] {
  if (sort === 'recommended') return [...groups];
  const value = (cabins: T[]): number => {
    const first = cabins[0];
    if (!first) return Infinity;
    if (sort === 'price') return getFlightLowestPrice(cabins) ?? Infinity;
    if (sort === 'departure') return first.departTime ? toMinutes(first.departTime) : Infinity;
    return getFlightDurationMinutes(first) ?? Infinity;
  };
  const isSoldOut = (cabins: T[]) => getFlightLowestPrice(cabins) === null;
  return [...groups].sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)) || value(a) - value(b));
}

/** Chuyến duy nhất rẻ nhất / bay nhanh nhất để gắn nhãn; nhiều chuyến bằng nhau thì không gắn. */
export function pickFlightHighlights<T extends FlightCabinOffer>(
  groups: readonly T[][],
): { cheapest?: number; fastest?: number } {
  const best = (score: (cabins: T[]) => number | null) => {
    const scored = groups.map((cabins, index) => ({ index, value: score(cabins) }));
    const values = scored.flatMap((item) => (item.value === null ? [] : [item.value]));
    if (!values.length) return undefined;
    const min = Math.min(...values);
    const winners = scored.filter((item) => item.value === min);
    return winners.length === 1 ? winners[0]!.index : undefined;
  };
  return {
    cheapest: best((cabins) => getFlightLowestPrice(cabins)),
    fastest: best((cabins) => (cabins[0] ? getFlightDurationMinutes(cabins[0]) : null)),
  };
}
