import { MAX_POST_IMAGE_BYTES, MAX_POST_IMAGES, resolveImageMimeType, type ImageMimeType } from '@tripflix/api-client';
import { t } from '@tripflix/i18n';

export interface AcceptedImageFile {
  file: File;
  mimeType: ImageMimeType;
}

export interface ImageFileSelection {
  accepted: AcceptedImageFile[];
  /** Một câu cho mỗi lý do, gộp tên file, để báo một lần. */
  messages: string[];
}

/**
 * Lọc file người dùng chọn: đúng loại (JPEG, PNG, WebP), không quá 10 MB, và không vượt số ảnh còn lại.
 * File vượt số lượng thì bỏ từ cuối, giữ đúng thứ tự đã chọn.
 */
export function selectImageFiles(files: readonly File[], currentCount: number): ImageFileSelection {
  const accepted: AcceptedImageFile[] = [];
  const wrongType: string[] = [];
  const tooLarge: string[] = [];
  let overLimit = 0;
  for (const file of files) {
    const mimeType = resolveImageMimeType(file.type, file.name);
    if (!mimeType) {
      wrongType.push(file.name);
    } else if (file.size > MAX_POST_IMAGE_BYTES) {
      tooLarge.push(file.name);
    } else if (currentCount + accepted.length >= MAX_POST_IMAGES) {
      overLimit += 1;
    } else {
      accepted.push({ file, mimeType });
    }
  }
  const messages = [
    ...(wrongType.length ? [t('api.composerImageWrongType', { names: wrongType.join(', ') })] : []),
    ...(tooLarge.length ? [t('api.composerImageTooLarge', { names: tooLarge.join(', ') })] : []),
    ...(overLimit ? [t('api.composerImageOverLimit', { max: MAX_POST_IMAGES })] : []),
  ];
  return { accepted, messages };
}

/** Đổi chỗ phần tử với phần tử kề bên; ra ngoài mảng thì giữ nguyên. */
export function moveItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

/** Nhãn số ảnh ở góc khu chọn ảnh, ví dụ "3/10". */
export function formatImageCount(count: number): string {
  return `${count}/${MAX_POST_IMAGES}`;
}

export const IMAGE_INPUT_ACCEPT = 'image/jpeg,image/png,image/webp';
