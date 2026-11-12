import { describe, expect, it } from 'vitest';
import { validatePostMedia } from './post-media';

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
