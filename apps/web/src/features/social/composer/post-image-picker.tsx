'use client';

import { useRef, useState, type DragEvent } from 'react';
import { MAX_POST_IMAGES } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { SocialIcon } from '../live-posts';
import { IMAGE_INPUT_ACCEPT, formatImageCount } from './post-image-files';
import type { usePostImages } from './use-post-images';
import styles from './post-image-picker.module.css';

export interface PostImagePickerProps {
  images: ReturnType<typeof usePostImages>;
  isDisabled?: boolean;
}

/** Khu chọn ảnh của bài viết: kéo thả hoặc bấm chọn, xem trước, đổi thứ tự, xoá, thử lại ảnh lỗi. */
export function PostImagePicker({ images, isDisabled = false }: PostImagePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { items } = images;
  const canAddMore = !isDisabled && items.length < MAX_POST_IMAGES;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setMessages(await images.addFiles(Array.from(files)));
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (canAddMore) void handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={styles.picker}
      data-drag-over={isDragOver || undefined}
      onDragOver={(event) => {
        if (!canAddMore) return;
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_INPUT_ACCEPT}
        multiple
        hidden
        disabled={!canAddMore}
        onChange={(event) => void handleFiles(event.target.files)}
      />

      {items.length === 0 ? (
        <button
          type="button"
          className={styles.dropzone}
          disabled={!canAddMore}
          aria-label={vi.api.composerImageAddAria}
          onClick={() => inputRef.current?.click()}
        >
          <span className={styles.dropzoneIcon}>
            <SocialIcon name="upload" size={22} />
          </span>
          <span className={styles.dropzoneText}>{vi.api.composerImageDropHint}</span>
          <span className={styles.dropzoneHint}>{vi.api.composerImageHint}</span>
        </button>
      ) : (
        <>
          <ol className={styles.grid}>
            {items.map((item, index) => {
              const position = index + 1;
              return (
                <li key={item.key} className={styles.tile} data-status={item.status}>
                  <span className={styles.thumb} style={{ backgroundImage: `url(${item.previewUrl})` }} />
                  {index === 0 && <span className={styles.coverBadge}>{vi.api.composerImageCover}</span>}

                  {item.status === 'uploading' && (
                    <output className={styles.overlay}>
                      <span className={styles.progressTrack} aria-hidden="true">
                        <span className={styles.progressFill} style={{ transform: `scaleX(${item.progress})` }} />
                      </span>
                      {t('api.composerImageUploading', { percent: Math.round(item.progress * 100) })}
                    </output>
                  )}
                  {item.status === 'failed' && (
                    <span className={`${styles.overlay} ${styles.overlayFailed}`}>
                      {vi.api.composerImageFailed}
                      <button type="button" className={styles.retryButton} onClick={() => images.retry(item.key)}>
                        {vi.api.composerImageRetry}
                      </button>
                    </span>
                  )}

                  <span className={styles.tileActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={isDisabled || index === 0}
                      aria-label={t('api.composerImageMoveLeft', { index: position })}
                      data-tooltip={t('api.composerImageMoveLeft', { index: position })}
                      onClick={() => images.move(item.key, -1)}
                    >
                      <SocialIcon name="chevronLeft" size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={isDisabled || index === items.length - 1}
                      aria-label={t('api.composerImageMoveRight', { index: position })}
                      data-tooltip={t('api.composerImageMoveRight', { index: position })}
                      onClick={() => images.move(item.key, 1)}
                    >
                      <SocialIcon name="chevronRight" size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={isDisabled}
                      aria-label={t('api.composerImageRemove', { index: position })}
                      data-tooltip={t('api.composerImageRemove', { index: position })}
                      onClick={() => images.remove(item.key)}
                    >
                      <SocialIcon name="close" size={14} />
                    </button>
                  </span>
                </li>
              );
            })}
            {canAddMore && (
              <li>
                <button
                  type="button"
                  className={styles.addTile}
                  aria-label={vi.api.composerImageAddAria}
                  onClick={() => inputRef.current?.click()}
                >
                  <SocialIcon name="plus" size={20} />
                  <span>{vi.api.composerImageAdd}</span>
                </button>
              </li>
            )}
          </ol>
          <p className={styles.footer}>
            <span>{vi.api.composerImageHint}</span>
            <span className={styles.count}>{formatImageCount(items.length)}</span>
          </p>
        </>
      )}

      {messages.length > 0 && (
        <output className={styles.messages}>
          {messages.map((message) => (
            <span key={message}>{message}</span>
          ))}
        </output>
      )}
    </div>
  );
}
