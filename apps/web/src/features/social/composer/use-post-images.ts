'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { uploadImage, type ImageMimeType } from '@tripflix/api-client';
import type { PostImageDto } from '@tripflix/api-client/core-api/model/index';
import { moveItem, selectImageFiles } from './post-image-files';

/** Tải song song tối đa chừng này ảnh: nhanh hơn từng ảnh một mà không nghẽn mạng yếu. */
const UPLOAD_CONCURRENCY = 3;

export interface PostImageItem {
  key: string;
  /** Ảnh mới: link blob để xem trước; ảnh đã có của bản nháp: link CDN. */
  previewUrl: string;
  status: 'uploading' | 'ready' | 'failed';
  /** 0 tới 1. */
  progress: number;
  assetId?: string;
  file?: File;
  mimeType?: ImageMimeType;
  widthPx?: number;
  heightPx?: number;
}

async function readImageSize(file: File): Promise<{ widthPx?: number; heightPx?: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { widthPx: bitmap.width, heightPx: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    // Trình duyệt không giải mã được (ảnh hỏng): vẫn tải lên, BE sẽ kiểm định dạng thật.
    return {};
  }
}

function createKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/**
 * Ảnh của bài viết trong form đăng bài: chọn là tải lên ngay (để lúc bấm Đăng không phải chờ), giữ thứ tự,
 * thử lại ảnh lỗi, và trả danh sách assetId theo thứ tự để gửi `media_ids`.
 */
export function usePostImages() {
  const [items, setItems] = useState<PostImageItem[]>([]);
  const controllersRef = useRef(new Map<string, AbortController>());
  const pendingRef = useRef<string[]>([]);
  const runningRef = useRef(0);
  // Bản đồng bộ để hàm tải (chạy ngoài lượt render) đọc được file của ảnh; addFiles và reset ghi trước.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const patchItem = useCallback((key: string, patch: Partial<PostImageItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }, []);

  // Tải xong một ảnh thì gọi lại pump qua ref để lấy ảnh kế tiếp trong hàng chờ.
  const pumpRef = useRef<() => void>(() => {});
  const pump = useCallback(() => {
    while (runningRef.current < UPLOAD_CONCURRENCY && pendingRef.current.length > 0) {
      const key = pendingRef.current.shift()!;
      const item = itemsRef.current.find((candidate) => candidate.key === key);
      if (!item?.file || !item.mimeType) continue;
      const controller = new AbortController();
      controllersRef.current.set(key, controller);
      runningRef.current += 1;
      const { file, mimeType, widthPx, heightPx } = item;
      void uploadImage(
        { body: file, sizeBytes: file.size, mimeType, widthPx, heightPx },
        {
          signal: controller.signal,
          onProgress: (uploaded, total) => patchItem(key, { progress: total > 0 ? uploaded / total : 0 }),
        },
      )
        .then((assetId) => patchItem(key, { status: 'ready', progress: 1, assetId }))
        .catch(() => {
          if (!controller.signal.aborted) patchItem(key, { status: 'failed' });
        })
        .finally(() => {
          controllersRef.current.delete(key);
          runningRef.current -= 1;
          pumpRef.current();
        });
    }
  }, [patchItem]);
  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  const enqueue = useCallback(
    (keys: string[]) => {
      pendingRef.current.push(...keys);
      // Chờ state có ảnh mới rồi mới lấy file ra tải.
      queueMicrotask(pump);
    },
    [pump],
  );

  const addFiles = useCallback(
    async (files: readonly File[]): Promise<string[]> => {
      const { accepted, messages } = selectImageFiles(files, itemsRef.current.length);
      const newItems = await Promise.all(
        accepted.map(async ({ file, mimeType }) => ({
          key: createKey(),
          previewUrl: URL.createObjectURL(file),
          status: 'uploading' as const,
          progress: 0,
          file,
          mimeType,
          ...(await readImageSize(file)),
        })),
      );
      if (newItems.length > 0) {
        itemsRef.current = [...itemsRef.current, ...newItems];
        setItems(itemsRef.current);
        enqueue(newItems.map((item) => item.key));
      }
      return messages;
    },
    [enqueue],
  );

  const releaseItem = useCallback((item: PostImageItem) => {
    controllersRef.current.get(item.key)?.abort();
    pendingRef.current = pendingRef.current.filter((key) => key !== item.key);
    if (item.file) URL.revokeObjectURL(item.previewUrl);
  }, []);

  const remove = useCallback(
    (key: string) => {
      const item = itemsRef.current.find((candidate) => candidate.key === key);
      if (item) releaseItem(item);
      setItems((prev) => prev.filter((candidate) => candidate.key !== key));
    },
    [releaseItem],
  );

  const move = useCallback((key: string, direction: -1 | 1) => {
    setItems((prev) => moveItem(prev, prev.findIndex((item) => item.key === key), direction));
  }, []);

  const retry = useCallback(
    (key: string) => {
      patchItem(key, { status: 'uploading', progress: 0 });
      enqueue([key]);
    },
    [enqueue, patchItem],
  );

  /** Bắt đầu lại: ảnh có sẵn của bản nháp (đã tải xong) hoặc rỗng khi viết bài mới. */
  const reset = useCallback(
    (existing: readonly PostImageDto[] = []) => {
      itemsRef.current.forEach(releaseItem);
      pendingRef.current = [];
      const next = existing.map((image) => ({
        key: image.id,
        previewUrl: image.url,
        status: 'ready' as const,
        progress: 1,
        assetId: image.id,
        ...(image.widthPx ? { widthPx: image.widthPx } : {}),
        ...(image.heightPx ? { heightPx: image.heightPx } : {}),
      }));
      itemsRef.current = next;
      setItems(next);
    },
    [releaseItem],
  );

  useEffect(
    () => () => {
      itemsRef.current.forEach(releaseItem);
    },
    [releaseItem],
  );

  const imageIds = useMemo(
    () => items.flatMap((item) => (item.status === 'ready' && item.assetId ? [item.assetId] : [])),
    [items],
  );

  return {
    items,
    imageIds,
    isUploading: items.some((item) => item.status === 'uploading'),
    hasFailed: items.some((item) => item.status === 'failed'),
    addFiles,
    remove,
    move,
    retry,
    reset,
  };
}
