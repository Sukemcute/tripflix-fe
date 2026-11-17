import { describe, expect, it } from 'vitest';
import { csvCell } from './operations-csv';

describe('CSV cells', () => {
  it('escapes commas, quotes and newlines', () => {
    expect(csvCell('nội dung, "báo cáo"\n')).toBe('"nội dung, ""báo cáo""\n"');
  });
  it('neutralizes spreadsheet formula injection including leading whitespace', () => {
    for (const value of ['=1+1', '+cmd', '-1+2', '@SUM(1)', '  =1', '\tvalue'])
      expect(csvCell(value)).toBe(`"'${value}"`);
    expect(csvCell('Bài viết')).toBe('"Bài viết"');
  });
});
