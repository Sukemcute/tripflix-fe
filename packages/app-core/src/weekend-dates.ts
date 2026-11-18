/** Thứ Bảy tới (hôm nay là thứ Bảy thì lấy hôm nay) và Chủ nhật kế đó, dạng YYYY-MM-DD, để gợi ý phòng cuối tuần. */
export function getNextWeekendDates(today: string): { checkIn: string; checkOut: string } {
  const date = new Date(`${today}T12:00:00Z`);
  const daysUntilSaturday = (6 - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + daysUntilSaturday);
  const checkIn = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 1);
  return { checkIn, checkOut: date.toISOString().slice(0, 10) };
}
