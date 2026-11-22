import { describe, expect, it } from 'vitest';
import { findArrivals } from './use-fresh-ids';

describe('findArrivals (TF104)', () => {
  it('lần tải đầu không đánh dấu hồ sơ nào là mới', () => {
    expect(findArrivals(null, ['a', 'b'])).toEqual([]);
  });

  it('chỉ đánh dấu id chưa từng thấy, giữ thứ tự của hàng chờ', () => {
    expect(findArrivals(new Set(['a', 'b']), ['c', 'a', 'd', 'b'])).toEqual(['c', 'd']);
  });

  it('hồ sơ đã rời hàng chờ rồi quay lại không bị coi là mới', () => {
    expect(findArrivals(new Set(['a', 'b']), ['b'])).toEqual([]);
  });
});
