// Đơn vị dài đặt trước đơn vị ngắn và phải kết thúc ở ranh giới từ: "triệu" không bị khớp thành "tr" + "iệu".
const BUDGET_PATTERN =
  /(?:dưới|tầm|khoảng|<=|<)?\s*\d+(?:[.,]\d+)?\s*(?:triệu|nghìn|ngàn|vnd|tr|k|đ)(?![\p{L}\p{N}])/giu;
const DAY_PATTERNS = [/\d+\s*n\s*\d+\s*đ(?![\p{L}\p{N}])/giu, /\d+\s*(?:ngày|đêm)(?![\p{L}\p{N}])/giu];

function tidy(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Bỏ điều kiện ngân sách khỏi câu tìm; còn trống thì lấy địa điểm, không có thì giữ nguyên câu cũ. */
export function relaxBudgetQuery(query: string, place?: string | null): string {
  const cleaned = tidy(query.replace(BUDGET_PATTERN, '').replace(/ngân sách/giu, ''));
  return cleaned || place || query;
}

/** Bỏ điều kiện số ngày (3 ngày, 2 đêm, 3N2Đ) khỏi câu tìm; còn trống thì lấy địa điểm. */
export function relaxDaysQuery(query: string, place?: string | null): string {
  const cleaned = tidy(DAY_PATTERNS.reduce((text, pattern) => text.replace(pattern, ''), query));
  return cleaned || place || query;
}
