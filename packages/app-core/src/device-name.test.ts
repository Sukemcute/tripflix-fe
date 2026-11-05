import { describe, expect, it } from 'vitest';
import { describeDevice } from './device-name';

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const EDGE_WINDOWS = `${CHROME_WINDOWS} Edg/131.0.0.0`;
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const FIREFOX_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:132.0) Gecko/20100101 Firefox/132.0';

describe('describeDevice', () => {
  it('đặt tên theo trình duyệt và hệ điều hành', () => {
    expect(describeDevice(CHROME_WINDOWS)).toBe('Chrome · Windows');
    expect(describeDevice(SAFARI_IPHONE)).toBe('Safari · iOS');
    expect(describeDevice(CHROME_ANDROID)).toBe('Chrome · Android');
    expect(describeDevice(FIREFOX_MAC)).toBe('Firefox · macOS');
  });

  it('Edge có chữ Chrome trong user agent nhưng vẫn nhận đúng là Edge', () => {
    expect(describeDevice(EDGE_WINDOWS)).toBe('Edge · Windows');
  });

  it('không nhận ra hoặc không có user agent thì trả null', () => {
    expect(describeDevice('curl/8.4.0')).toBeNull();
    expect(describeDevice('')).toBeNull();
    expect(describeDevice(undefined)).toBeNull();
  });
});
