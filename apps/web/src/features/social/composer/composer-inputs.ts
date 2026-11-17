/** Logic thuần của pop-up đăng bài (thẻ, tiến độ tải video, file thả vào): tách khỏi component để test được. */

export const HASHTAG_MAX = 10;
export const HASHTAG_LENGTH_MAX = 30;

/** "#HộiAn" → "hộian": bỏ dấu # và khoảng trắng, chữ thường, cắt 30 ký tự. Rỗng thì trả "". */
export function normalizeHashtag(raw: string): string {
  return raw.replace(/[#\s]+/g, '').toLowerCase().slice(0, HASHTAG_LENGTH_MAX);
}

/** Thêm các thẻ gõ hoặc dán vào ("dalat, #canhdep amthuc"): tách theo dấu phẩy và khoảng trắng, bỏ thẻ trùng, tối đa 10 thẻ. */
export function appendHashtags(current: readonly string[], raw: string): string[] {
  const next = [...current];
  for (const part of raw.split(/[,\s]+/)) {
    const tag = normalizeHashtag(part);
    if (tag && !next.includes(tag) && next.length < HASHTAG_MAX) next.push(tag);
  }
  return next;
}

/** Chuỗi hashtag cũ của bản nháp ("a, b c" hoặc mảng) về danh sách thẻ. */
export function parseStoredHashtags(tags: readonly string[] | undefined): string[] {
  return appendHashtags([], (tags ?? []).join(','));
}

/** Phần trăm hiện trên thanh: 0–5% khởi tạo, 5–90% theo byte đã gửi, 90–100% chờ server hoàn tất. */
export const UPLOAD_PERCENT_START = 5;
export const UPLOAD_PERCENT_SENT = 90;

export function calculateUploadPercent(sentBytes: number, totalBytes: number): number {
  if (totalBytes <= 0) return UPLOAD_PERCENT_START;
  const ratio = Math.min(1, Math.max(0, sentBytes / totalBytes));
  return Math.round(UPLOAD_PERCENT_START + ratio * (UPLOAD_PERCENT_SENT - UPLOAD_PERCENT_START));
}

const VIDEO_EXTENSIONS = /\.(mp4|mov)$/i;
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime']);

/** File kéo thả vào ô video: lấy file đầu tiên, chỉ nhận MP4 hoặc MOV (giống `accept` của ô chọn file). */
export function pickDroppedVideo(files: ArrayLike<File> | null): { file: File } | { error: 'empty' | 'type' } {
  const file = files?.[0];
  if (!file) return { error: 'empty' };
  if (!VIDEO_TYPES.has(file.type) && !VIDEO_EXTENSIONS.test(file.name)) return { error: 'type' };
  return { file };
}
