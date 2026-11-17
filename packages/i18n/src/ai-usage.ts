/** Trang admin chi phí gọi AI (TF95): số lần gọi, token, chi phí theo tính năng, ngày, model. */
export const aiUsage = {
  eyebrow: 'AI / Chi phí',
  title: 'Chi phí AI',
  description: 'Số lần gọi, token và chi phí ước tính của trợ lý Tripi, tóm tắt bình luận và kiểm duyệt.',
  range: 'Khoảng thời gian',
  ranges: { '7': '7 ngày', '30': '30 ngày', '90': '90 ngày' },
  groupBy: 'Xem theo',
  groups: { feature: 'Tính năng', day: 'Ngày', model: 'Model' },
  features: { chat: 'Trợ lý Tripi', summary: 'Tóm tắt bình luận', moderation: 'Kiểm duyệt' },
  columns: { key: 'Nhóm', calls: 'Lần gọi', inputTokens: 'Token vào', outputTokens: 'Token ra', costUsd: 'Chi phí (USD)' },
  total: 'Tổng',
  empty: 'Chưa có lần gọi AI nào trong khoảng này.',
  estimated: 'Chi phí ước tính theo bảng giá trong ai-service, không phải hoá đơn của nhà cung cấp.',
} as const;
