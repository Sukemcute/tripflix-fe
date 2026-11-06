export const MAX_STAY_NIGHTS = 14;
export const MAX_STAY_GUESTS = 9;
export const MAX_STAY_ROOMS = 9;
export const MAX_STAY_PRICE = 9_999_999_999;

const vietnamDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

export function getStayToday() {
  return vietnamDate.format(new Date());
}

export function isStayInteger(value: string, min: number, max: number) {
  return (
    value.length <= String(max).length && /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max
  );
}

export function isStayDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value);
}

export function addStayDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0]!;
}

export function getStayDateIssue(checkIn: string, checkOut: string, today: string) {
  if (!isStayDate(checkIn) || checkIn < today) return 'invalidCheckIn';
  if (!isStayDate(checkOut) || checkOut <= checkIn) return 'invalidDates';
  if (Date.parse(checkOut) - Date.parse(checkIn) > MAX_STAY_NIGHTS * 86_400_000) return 'stayTooLong';
  return null;
}

export function getStayPriceIssue(min: string, max: string) {
  if ((min && !isStayInteger(min, 0, MAX_STAY_PRICE)) || (max && !isStayInteger(max, 0, MAX_STAY_PRICE))) {
    return 'invalidPrice';
  }
  if (min && max && Number(min) > Number(max)) return 'invalidPriceRange';
  return null;
}
