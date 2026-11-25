/**
 * Địa điểm khách sạn truyền sang Khám phá qua đường dẫn (`/explore?q=Đà Lạt`), ví dụ từ thẻ khách sạn ở Tìm kiếm.
 * Expo Router có thể trả mảng khi tham số lặp lại: lấy giá trị đầu. Rỗng hoặc chỉ có khoảng trắng thì coi như không có.
 */
export function getExploreHotelQuery(param: string | string[] | undefined): string {
  const value = Array.isArray(param) ? param[0] : param;
  return value?.trim() ?? '';
}
