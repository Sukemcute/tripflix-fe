import { describe, expect, it } from 'vitest';
import { pushRecentSearch, removeRecentSearch } from './recent-searches';

describe('pushRecentSearch', () => {
  it('đưa từ khoá mới lên đầu và bỏ bản trùng không phân biệt hoa thường', () => {
    expect(pushRecentSearch(['hội an', 'Đà Lạt', 'sapa'], ' đà lạt ')).toEqual(['đà lạt', 'hội an', 'sapa']);
  });

  it('giữ tối đa số mục cho phép', () => {
    expect(pushRecentSearch(['a1', 'a2', 'a3'], 'mới', 3)).toEqual(['mới', 'a1', 'a2']);
  });

  it('từ khoá rỗng thì giữ nguyên danh sách', () => {
    expect(pushRecentSearch(['hội an'], '   ')).toEqual(['hội an']);
  });
});

describe('removeRecentSearch', () => {
  it('xoá đúng mục, không phân biệt hoa thường', () => {
    expect(removeRecentSearch(['Phú Quốc', 'sapa'], 'phú quốc')).toEqual(['sapa']);
  });
});
