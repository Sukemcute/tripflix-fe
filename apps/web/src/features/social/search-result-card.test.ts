import { describe, expect, it } from 'vitest';
import { formatSearchCardDate, getSearchCardCaption } from './search-result-card';
import { buildInspirationHref, parseSearchResultType } from './search-url';

describe('formatSearchCardDate', () => {
  const now = new Date(2026, 10, 12, 12, 0, 0);

  it('gần đây thì hiện thời gian tương đối', () => {
    expect(formatSearchCardDate(new Date(2026, 10, 12, 11, 59, 30).toISOString(), now)).toBe('Vừa xong');
    expect(formatSearchCardDate(new Date(2026, 10, 12, 11, 15).toISOString(), now)).toBe('45 phút trước');
    expect(formatSearchCardDate(new Date(2026, 10, 12, 2, 0).toISOString(), now)).toBe('10 giờ trước');
    expect(formatSearchCardDate(new Date(2026, 10, 6, 12, 0).toISOString(), now)).toBe('6 ngày trước');
  });

  it('quá 7 ngày thì hiện ngày, năm khác thì kèm năm', () => {
    expect(formatSearchCardDate(new Date(2026, 6, 12, 9, 0).toISOString(), now)).toBe('12/7');
    expect(formatSearchCardDate(new Date(2025, 9, 11, 9, 0).toISOString(), now)).toBe('11/10/2025');
  });

  it('ngày sai định dạng thì để trống thay vì hiện "Invalid Date"', () => {
    expect(formatSearchCardDate('không-phải-ngày', now)).toBe('');
  });
});

describe('getSearchCardCaption', () => {
  it('ưu tiên tiêu đề, bỏ dấu # thừa ở hashtag', () => {
    expect(getSearchCardCaption({ title: ' Đà Lạt 3N2Đ ', body: 'x', hashtags: ['#dalat', 'chill', ' '] })).toEqual({
      text: 'Đà Lạt 3N2Đ',
      tags: ['dalat', 'chill'],
    });
  });

  it('không có tiêu đề thì lấy dòng đầu có chữ của nội dung', () => {
    expect(getSearchCardCaption({ title: '', body: '\n  Săn mây Cầu Đất\nDòng 2', hashtags: [] }).text).toBe(
      'Săn mây Cầu Đất',
    );
  });
});

describe('buildInspirationHref', () => {
  it('chốt từ khoá mới thì bỏ bài đang mở, giữ tham số khác', () => {
    expect(buildInspirationHref('/inspiration', 'view=reels&q=cu&open=p1', { keyword: ' đà lạt ' })).toBe(
      '/inspiration?view=reels&q=%C4%91%C3%A0+l%E1%BA%A1t',
    );
  });

  it('xoá từ khoá thì thoát tìm kiếm hẳn', () => {
    expect(buildInspirationHref('/inspiration', 'q=dalat&open=p1', { keyword: '' })).toBe('/inspiration');
  });

  it('mở bài rồi quay lại grid, đổi tab bỏ được ?view', () => {
    const opened = buildInspirationHref('/inspiration', 'q=dalat', { openPostId: 'p1' });
    expect(opened).toBe('/inspiration?q=dalat&open=p1');
    expect(buildInspirationHref('/inspiration', 'q=dalat&open=p1', { openPostId: null })).toBe('/inspiration?q=dalat');
    expect(buildInspirationHref('/inspiration', 'view=reels', { keyword: null, view: 'posts' })).toBe('/inspiration');
  });
});

describe('tab kết quả trên URL', () => {
  it('đổi tab giữ từ khoá; Tất cả thì bỏ ?type', () => {
    expect(buildInspirationHref('/inspiration', 'q=dalat', { resultType: 'reels' })).toBe('/inspiration?q=dalat&type=reels');
    expect(buildInspirationHref('/inspiration', 'q=dalat&type=reels', { resultType: 'all' })).toBe('/inspiration?q=dalat');
  });

  it('tìm từ khoá khác giữ tab, thoát tìm kiếm thì bỏ tab', () => {
    expect(buildInspirationHref('/inspiration', 'q=dalat&type=posts', { keyword: 'sapa' })).toBe('/inspiration?q=sapa&type=posts');
    expect(buildInspirationHref('/inspiration', 'q=dalat&type=posts', { keyword: null })).toBe('/inspiration');
  });

  it('giá trị lạ thì về Tất cả', () => {
    expect(parseSearchResultType('reels')).toBe('reels');
    expect(parseSearchResultType('users')).toBe('all');
    expect(parseSearchResultType(null)).toBe('all');
  });
});
