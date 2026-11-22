// Đọc các dòng thẻ Tripi (do tripflix-ai dựng) thành cấu trúc để vẽ timeline/thời tiết.
// Chỉ phục vụ hiển thị: dòng không đọc được vẫn giữ nguyên văn, không bỏ dữ liệu.

export type DayPart = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

export interface ItineraryStop {
  /** Buổi trong ngày nếu có ("Sáng", "Chiều"...). */
  part: DayPart | null;
  /** Nhãn buổi đúng như AI gửi, để hiện lại. */
  partLabel: string | null;
  title: string;
  /** Nơi chốn phụ (lộ trình của reel: "hoạt động · nơi"). */
  place: string | null;
  distanceKm: number | null;
  minutes: number | null;
  /** Dịch vụ Tripflix (chuyến bay, khách sạn) lồng trong lộ trình; null là điểm thường. */
  service: 'flight' | 'stay' | null;
}

export interface ItineraryDay {
  /** null: dòng không ghi ngày ("Điểm"). */
  day: number | null;
  stops: ItineraryStop[];
}

export interface ItineraryLineInput {
  label: string;
  detail?: string | null;
  service?: 'flight' | 'stay' | null;
}

const PARTS: [RegExp, DayPart][] = [
  [/^sáng/i, 'morning'],
  [/^trưa/i, 'noon'],
  [/^chiều/i, 'afternoon'],
  [/^tối/i, 'evening'],
  [/^đêm/i, 'night'],
];

export function readDayPart(text: string): DayPart | null {
  const value = text.trim();
  return PARTS.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

/** "khoảng 1.2 km, 5 phút" hoặc "1,2 km · 5 phút". */
function readLeg(text: string): { distanceKm: number; minutes: number | null } | null {
  const match = /(?:khoảng\s*)?(\d+(?:[.,]\d+)?)\s*km(?:\s*[,·]\s*(\d+)\s*phút)?/i.exec(text);
  if (!match?.[1]) return null;
  return {
    distanceKm: Number(match[1].replace(',', '.')),
    minutes: match[2] ? Number(match[2]) : null,
  };
}

export function parseItineraryLine(line: ItineraryLineInput): { day: number | null; stop: ItineraryStop } {
  const [head, ...rest] = line.label.split('·').map((part) => part.trim());
  const dayMatch = /^ngày\s*(\d+)$/i.exec(head ?? '');
  const day = dayMatch ? Number(dayMatch[1]) : null;
  const partLabel = rest.length ? rest.join(' · ') : null;
  const pieces = (line.detail ?? '')
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
  const legIndex = pieces.findIndex((piece) => readLeg(piece));
  const leg = readLeg(pieces[legIndex] ?? '');
  const texts = pieces.filter((_, index) => index !== legIndex);
  // Không có chi tiết thì nhãn chính là nội dung (dòng lạ, "Điểm").
  const title = texts[0] ?? (dayMatch ? (partLabel ?? line.label) : line.label);
  return {
    day,
    stop: {
      part: partLabel ? readDayPart(partLabel) : null,
      partLabel: texts.length || !dayMatch ? partLabel : null,
      title,
      place: texts.slice(1).join(' · ') || null,
      distanceKm: leg?.distanceKm ?? null,
      minutes: leg?.minutes ?? null,
      service: line.service === 'flight' || line.service === 'stay' ? line.service : null,
    },
  };
}

/** Gom các dòng liên tiếp cùng ngày thành một nhóm, giữ đúng thứ tự AI gửi. */
export function groupItineraryLines(lines: readonly ItineraryLineInput[]): ItineraryDay[] {
  const days: ItineraryDay[] = [];
  for (const line of lines) {
    const { day, stop } = parseItineraryLine(line);
    const last = days.at(-1);
    if (last && last.day === day) last.stops.push(stop);
    else days.push({ day, stops: [stop] });
  }
  return days;
}

export type WeatherSky = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'fog';

export interface WeatherLine {
  minC: number | null;
  maxC: number | null;
  sky: string | null;
  skyKind: WeatherSky;
  rainChance: number | null;
}

export function readWeatherSky(text: string): WeatherSky {
  const value = text.toLowerCase();
  if (/dông|giông|bão/.test(value)) return 'storm';
  if (/mưa/.test(value)) return 'rain';
  if (/sương|mù/.test(value)) return 'fog';
  if (/mây|âm u|nhiều mây/.test(value)) return 'cloudy';
  return 'sunny';
}

/** "15–22°C, mưa rào, mưa 60%" (cũng nhận dấu "·" và "-"). */
export function parseWeatherLine(detail: string | null | undefined): WeatherLine {
  const text = detail ?? '';
  const temp = /(-?\d+)\s*[–-]\s*(-?\d+)\s*°?\s*C/i.exec(text);
  const rain = /(\d{1,3})\s*%/.exec(text);
  const sky =
    text
      .split(/[,·]/)
      .map((part) => part.trim())
      .find((part) => part && !/°|%/.test(part)) ?? null;
  return {
    minC: temp ? Number(temp[1]) : null,
    maxC: temp ? Number(temp[2]) : null,
    sky,
    skyKind: readWeatherSky(sky ?? text),
    rainChance: rain ? Number(rain[1]) : null,
  };
}
