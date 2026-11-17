import { MAX_POST_IMAGE_BYTES, resolveImageMimeType, type ImageUploadSource } from '@tripflix/api-client';
import { File, FileMode } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * Đổi ảnh vừa chọn (poster lộ trình) thành nguồn cho uploadImage của TF25: ảnh tải một lần nên đọc cả file.
 * Loại ảnh không nhận, file rỗng hoặc quá 10 MB thì trả null.
 */
export async function toPickedImage(asset: ImagePickerAsset): Promise<ImageUploadSource | null> {
  const mimeType = resolveImageMimeType(asset.mimeType, asset.fileName ?? asset.uri);
  if (!mimeType) return null;
  const size = { widthPx: asset.width || undefined, heightPx: asset.height || undefined };
  if (Platform.OS === 'web') {
    // Trên web thư viện chọn file trả kèm đối tượng File của trình duyệt.
    const blob = asset.file;
    if (!blob?.size || blob.size > MAX_POST_IMAGE_BYTES) return null;
    return { body: blob, sizeBytes: blob.size, mimeType, ...size };
  }
  const file = new File(asset.uri);
  const sizeBytes = asset.fileSize || file.size;
  if (!sizeBytes || sizeBytes > MAX_POST_IMAGE_BYTES) return null;
  const handle = file.open(FileMode.ReadOnly);
  try {
    return { body: await handle.readBytes(sizeBytes), sizeBytes, mimeType, ...size };
  } finally {
    handle.close();
  }
}
