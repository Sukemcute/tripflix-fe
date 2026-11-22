/** Dữ liệu gợi ý từ Tripi chỉ điền draft; phòng, hạng vé và giá lấy ở màn chọn thật. */
export const TRIP_BUILDER_SEED_KEYS = [
  'destination',
  'adults',
  'startDate',
  'days',
  'hotelId',
  'hotelName',
  'checkIn',
  'nights',
  'flightFrom',
  'flightTo',
  'flightDate',
  'returnFrom',
  'returnTo',
  'returnDate',
] as const;

type SeedFlight = { from: string; to: string; date: string };

export interface TripBuilderSeed {
  destination: { destinationName: string; destinationPlaceId: string };
  adults: number;
  dayCount: number;
  startDate?: string;
  hotel?: { hotelId: string; hotelName: string; checkIn: string; nights: number };
  flight?: SeedFlight;
  /** Chuyến về: mở sau khi khách chọn xong chuyến đi, đi theo luồng chiều về sẵn có. */
  returnFlight?: SeedFlight;
}

export function readTripBuilderSeed(params: Record<string, unknown>, today: string): TripBuilderSeed | null {
  const read = (key: string) => (typeof params[key] === 'string' ? params[key].trim() : '');
  const count = (key: string, max: number) => {
    const value = Number(read(key));
    return Number.isInteger(value) && value >= 1 && value <= max ? value : undefined;
  };
  const day = (key: string) => {
    const value = read(key);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < today) return undefined;
    const parsed = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
      ? value
      : undefined;
  };
  const leg = (fromKey: string, toKey: string, dateKey: string): SeedFlight | undefined => {
    const from = read(fromKey);
    const to = read(toKey);
    const date = day(dateKey);
    return /^[A-Z]{3}$/.test(from) && /^[A-Z]{3}$/.test(to) && from !== to && date ? { from, to, date } : undefined;
  };
  const destinationName = read('destination');
  const adults = count('adults', 9);
  const dayCount = count('days', 30);
  const checkIn = day('checkIn');
  const nights = count('nights', 30);
  const hotelId = read('hotelId');
  const hotel =
    hotelId && checkIn && nights ? { hotelId, hotelName: read('hotelName'), checkIn, nights } : undefined;
  const flight = leg('flightFrom', 'flightTo', 'flightDate');
  const back = leg('returnFrom', 'returnTo', 'returnDate');
  // Chuyến về phải quay lại đúng nơi đi và không trước chuyến đi.
  const returnFlight =
    back && flight && back.from === flight.to && back.to === flight.from && back.date >= flight.date ? back : undefined;
  const startDate = day('startDate') ?? flight?.date ?? hotel?.checkIn;
  if (!destinationName && !adults && !dayCount && !startDate && !hotel && !flight) return null;
  return {
    destination: { destinationName, destinationPlaceId: '' },
    adults: adults ?? 2,
    dayCount: dayCount ?? 0,
    startDate,
    hotel,
    flight,
    returnFlight,
  };
}
