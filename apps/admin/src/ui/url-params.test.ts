import { describe, expect, it } from 'vitest';
import { applyParamPatch, readEnumParam, readPageParam } from './url-params';

describe('applyParamPatch', () => {
  it('thêm, đổi và giữ nguyên các khoá không đụng tới', () => {
    expect(applyParamPatch('tab=roles&q=an', { q: 'binh', page: '2' })).toBe('tab=roles&q=binh&page=2');
  });

  it('xoá khoá khi giá trị rỗng, null hoặc undefined', () => {
    expect(applyParamPatch('tab=roles&q=an&page=3', { q: '', page: null })).toBe('tab=roles');
    expect(applyParamPatch('tab=roles', { tab: undefined })).toBe('');
  });

  it('mã hoá ký tự đặc biệt và tiếng Việt', () => {
    const search = applyParamPatch('', { q: 'Hội An & Đà Nẵng' });
    expect(new URLSearchParams(search).get('q')).toBe('Hội An & Đà Nẵng');
  });

  it('không có gì thay đổi thì trả chuỗi rỗng', () => {
    expect(applyParamPatch('', {})).toBe('');
  });
});

describe('readEnumParam', () => {
  const allowed = ['', 'active', 'locked'] as const;

  it('nhận giá trị hợp lệ', () => {
    expect(readEnumParam('locked', allowed, '')).toBe('locked');
  });

  it('giá trị lạ hoặc thiếu thì dùng mặc định (không tin URL do người dùng gõ)', () => {
    expect(readEnumParam('<script>', allowed, '')).toBe('');
    expect(readEnumParam(null, allowed, 'active')).toBe('active');
  });
});

describe('readPageParam', () => {
  it('nhận số nguyên từ 1', () => {
    expect(readPageParam('4')).toBe(4);
  });

  it('sai định dạng, số âm, số lẻ hoặc 0 thì về trang 1', () => {
    for (const value of [null, '', 'abc', '0', '-2', '1.5']) expect(readPageParam(value)).toBe(1);
  });
});
