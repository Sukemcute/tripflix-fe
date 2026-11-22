import { describe, expect, it } from 'vitest';
import {
  getPostCaption,
  getPostTitleFromCaption,
  POST_TITLE_MAX_LENGTH,
  shouldCompressVideo,
  validatePostMedia,
} from './post-media';

const image = { type: 'image', width: 600, height: 400 };
const video = { type: 'video', width: 600, height: 400, durationMs: 300_000 };

describe('post media selection', () => {
  it('accepts up to ten valid photos, rejects an eleventh', () => {
    expect(validatePostMedia(Array(10).fill(image), 'image')).toBeNull();
    expect(validatePostMedia(Array(11).fill(image), 'image')).toBe('tooManyImages');
  });
  it('rejects empty, mixed and unreadable selections', () => {
    expect(validatePostMedia([], 'image')).toBe('invalidMedia');
    expect(validatePostMedia([image, video], 'image')).toBe('invalidMedia');
    expect(validatePostMedia([{ ...image, width: 0 }], 'image')).toBe('invalidMedia');
  });
  it('accepts a five minute video and rejects anything longer or multiple videos', () => {
    expect(validatePostMedia([video], 'video')).toBeNull();
    expect(validatePostMedia([{ ...video, durationMs: 300_001 }], 'video')).toBe('tooLong');
    expect(validatePostMedia([video, video], 'video')).toBe('invalidMedia');
  });
  it.each([null, undefined, NaN, Infinity, 0, -1])(
    'rejects unknown or invalid video duration %s',
    (durationMs) => {
      expect(validatePostMedia([{ ...video, durationMs }], 'video')).toBe('unknownDuration');
    },
  );
});

describe('shouldCompressVideo', () => {
  const MB = 1_000_000;
  it('compresses the measured iPhone clip: 1080p 60 fps, 100 MB in 34 s (~23 Mbps)', () => {
    expect(
      shouldCompressVideo({ width: 1080, height: 1920, sizeBytes: 100.5 * MB, durationMs: 34_237 }),
    ).toBe(true);
  });
  it('compresses anything larger than 1080p even at a low bitrate', () => {
    expect(shouldCompressVideo({ width: 2160, height: 3840, sizeBytes: 20 * MB, durationMs: 60_000 })).toBe(
      true,
    );
  });
  it('sends a light 1080p or smaller video as is', () => {
    expect(shouldCompressVideo({ width: 1080, height: 1920, sizeBytes: 60 * MB, durationMs: 60_000 })).toBe(
      false,
    );
    expect(shouldCompressVideo({ width: 720, height: 1280, sizeBytes: 10 * MB, durationMs: 30_000 })).toBe(
      false,
    );
  });
  it('compresses when size, duration or dimensions are unknown', () => {
    expect(shouldCompressVideo({ width: 0, height: 0, sizeBytes: 10 * MB, durationMs: 30_000 })).toBe(true);
    expect(shouldCompressVideo({ width: 1080, height: 1920, sizeBytes: 0, durationMs: 30_000 })).toBe(true);
    expect(shouldCompressVideo({ width: 1080, height: 1920, sizeBytes: 10 * MB, durationMs: 0 })).toBe(true);
  });
});

describe('post caption', () => {
  it('lấy tiêu đề từ dòng đầu caption, cắt theo từ khi quá dài', () => {
    expect(getPostTitleFromCaption('  Đà Lạt 3N2Đ\nNgày 1 đi chợ đêm ')).toBe('Đà Lạt 3N2Đ');
    const long = 'Chuyến đi '.repeat(15).trim();
    const title = getPostTitleFromCaption(long);
    expect(title.length).toBeLessThanOrEqual(POST_TITLE_MAX_LENGTH);
    expect(title.endsWith('…')).toBe(true);
    expect(long.startsWith(title.slice(0, -1))).toBe(true);
  });

  it('chỉ hiện caption với bài mới, ghép tiêu đề với bài cũ', () => {
    expect(getPostCaption('Đà Lạt 3N2Đ', 'Đà Lạt 3N2Đ\nNgày 1 đi chợ đêm')).toBe(
      'Đà Lạt 3N2Đ\nNgày 1 đi chợ đêm',
    );
    expect(getPostCaption('Chuyến đi …', 'Chuyến đi rất dài')).toBe('Chuyến đi rất dài');
    expect(getPostCaption('Cáp treo Hòn Tre', 'Ngồi cáp treo vượt biển')).toBe(
      'Cáp treo Hòn Tre · Ngồi cáp treo vượt biển',
    );
    expect(getPostCaption('Chỉ có tiêu đề', '')).toBe('Chỉ có tiêu đề');
  });
});
