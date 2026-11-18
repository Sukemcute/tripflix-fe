'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { t, vi } from '@tripflix/i18n';
import { formatReelTime, getReelKeySeekTarget } from './reel-post';
import styles from './live-posts.module.css';

/** Video đang phát mà thời gian không chạy quá chừng này (mạng yếu, đang tải) thì thanh tiến độ hiện vệt sáng. */
const STALL_MS = 400;

/**
 * Thanh tiến độ kiêm thanh tua của Reel đang xem (như TikTok):
 * - Bấm vào một điểm: tua tới đó.
 * - Bấm rồi kéo: thanh đi theo chuột, hiện mốc "0:17 / 0:23"; thả chuột mới tua (tua liên tục khi kéo làm HLS tải
 *   lại liên tục).
 * - Phím ← / →: lùi, tiến 5 giây; Home / End: về đầu, cuối (getReelKeySeekTarget).
 * Dùng <input type="range"> trong suốt phủ lên thanh để có sẵn bấm, kéo, bàn phím và trình đọc màn hình.
 * Vị trí và vệt sáng khi chờ tải cập nhật mỗi khung hình qua ref (không setState) để không render lại cả viewer.
 */
export function ReelSeekBar({
  videoRef,
  onScrubChange,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Bắt đầu, kết thúc kéo: Reel ẩn, hiện lại phần chữ ở đáy video. */
  onScrubChange?: (isScrubbing: boolean) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isScrubbingRef = useRef(false);
  // Mốc đang kéo tới (giây) và độ dài video, để hiện "0:17 / 0:23"; null khi không kéo.
  const [scrub, setScrub] = useState<{ seconds: number; duration: number } | null>(null);

  useEffect(() => {
    const frame = { id: 0 };
    let lastTime = -1;
    let lastAdvanceAt = performance.now();
    let lastAnnouncedSecond = -1;
    const tick = () => {
      const video = videoRef.current;
      const fill = fillRef.current;
      const track = trackRef.current;
      const input = inputRef.current;
      if (video && video.duration > 0 && Number.isFinite(video.duration)) {
        if (!isScrubbingRef.current) {
          if (fill) fill.style.transform = `scaleX(${Math.min(1, video.currentTime / video.duration)})`;
          if (input) {
            input.max = String(video.duration);
            input.value = String(video.currentTime);
            const second = Math.floor(video.currentTime);
            if (second !== lastAnnouncedSecond) {
              lastAnnouncedSecond = second;
              input.setAttribute(
                'aria-valuetext',
                t('api.reelSeekValue', {
                  current: formatReelTime(video.currentTime),
                  duration: formatReelTime(video.duration),
                }),
              );
            }
          }
        }
      }
      if (video && track) {
        const now = performance.now();
        if (video.paused || video.currentTime !== lastTime) lastAdvanceAt = now;
        lastTime = video.currentTime;
        const isBuffering = !video.paused && now - lastAdvanceAt > STALL_MS && !isScrubbingRef.current;
        if (track.hasAttribute('data-buffering') !== isBuffering) track.toggleAttribute('data-buffering', isBuffering);
      }
      frame.id = window.requestAnimationFrame(tick);
    };
    frame.id = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame.id);
  }, [videoRef]);

  const showScrub = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !(video.duration > 0) || !Number.isFinite(video.duration)) return;
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${Math.min(1, seconds / video.duration)})`;
    if (!scrub) onScrubChange?.(true);
    setScrub({ seconds, duration: video.duration });
  };

  const seekTo = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(seconds)) return;
    video.currentTime = Math.max(0, Math.min(seconds, video.duration || seconds));
  };

  const endScrub = () => {
    if (!isScrubbingRef.current) return;
    isScrubbingRef.current = false;
    seekTo(Number(inputRef.current?.value ?? 0));
    setScrub(null);
    onScrubChange?.(false);
    // Thao tác bằng chuột xong thì bỏ focus: không còn viền focus quanh thanh (Tab tới vẫn dùng phím được).
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // ↑ / ↓ để chuyển bài như mọi nơi khác trong Reels (bộ phím chung xử lý): chặn để thanh tua không đổi giá trị.
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      return;
    }
    const video = videoRef.current;
    const target = video ? getReelKeySeekTarget(event.key, video.currentTime, video.duration) : null;
    if (target === null) return;
    // Tự tua (không để range đổi giá trị theo bước mặc định rồi bắn change).
    event.preventDefault();
    seekTo(target);
  };

  return (
    <div className={styles.progressBar} data-scrubbing={scrub ? true : undefined}>
      {scrub && (
        <output className={styles.seekTimeLabel}>
          <span className={styles.seekTimeCurrent}>{formatReelTime(scrub.seconds)}</span>
          {' / '}
          {formatReelTime(scrub.duration)}
        </output>
      )}
      <div ref={trackRef} className={styles.progressBarTrack} aria-hidden="true">
        <div ref={fillRef} className={styles.progressBarFill} />
      </div>
      <input
        ref={inputRef}
        type="range"
        className={styles.progressBarInput}
        min={0}
        max={0}
        step="any"
        defaultValue={0}
        aria-label={vi.api.reelSeekAria}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          isScrubbingRef.current = true;
        }}
        onChange={(event) => {
          const seconds = Number(event.currentTarget.value);
          // Đang kéo: chỉ xem trước; bấm một điểm hoặc phím Home/End (không qua pointerdown): tua luôn.
          if (isScrubbingRef.current) showScrub(seconds);
          else seekTo(seconds);
        }}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        onLostPointerCapture={endScrub}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
