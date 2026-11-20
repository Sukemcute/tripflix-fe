import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type DataColumn } from './data-table';
import { MetricStrip } from './metric-strip';
import { Pagination } from './pagination';
import { StatusBadge } from './status-badge';
import { Tabs } from './tabs';
vi.stubGlobal('React', React);

interface Row {
  id: string;
  name: string;
  note: string;
}
const columns: DataColumn<Row>[] = [
  { id: 'name', header: 'Tên', cell: (row) => row.name },
  { id: 'note', header: 'Ghi chú', hideBelow: 'md', cell: (row) => row.note },
];
const rows: Row[] = [
  { id: 'a', name: 'An', note: 'x' },
  { id: 'b', name: 'Bình', note: 'y' },
];

describe('DataTable', () => {
  it('vẽ tiêu đề cột, dòng, và ẩn cột phụ khi hẹp', () => {
    const html = renderToStaticMarkup(
      <DataTable label="Danh sách" columns={columns} rows={rows} getRowId={(row) => row.id} />,
    );
    expect(html).toContain('aria-label="Danh sách"');
    expect(html).toContain('>Tên<');
    expect(html).toContain('max-md:hidden');
    expect(html).toContain('Bình');
    expect(html).not.toContain('<button');
  });

  it('có onRowOpen thì ô đầu là nút thật, hàng đang chọn có aria-current và dấu chọn', () => {
    const html = renderToStaticMarkup(
      <DataTable
        label="Danh sách"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        onRowOpen={() => undefined}
        selectedId="b"
      />,
    );
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toContain('data-selected="true"');
  });

  it('đang tải mà chưa có dòng thì hiện khung chờ và đánh dấu aria-busy', () => {
    const html = renderToStaticMarkup(
      <DataTable label="Danh sách" columns={columns} rows={[]} getRowId={(row) => row.id} isLoading loadingRows={2} />,
    );
    expect(html).toContain('aria-busy="true"');
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
  });

  it('không có dòng và không tải thì hiện nội dung rỗng', () => {
    const html = renderToStaticMarkup(
      <DataTable label="Danh sách" columns={columns} rows={[]} getRowId={(row) => row.id} empty={<p>Trống</p>} />,
    );
    expect(html).toContain('Trống');
  });
});

describe('MetricStrip', () => {
  it('ô liên kết, ô nút lọc và ô tĩnh; thiếu dữ liệu hiện dấu —', () => {
    const html = renderToStaticMarkup(
      <MetricStrip
        label="Số liệu"
        items={[
          { id: 'a', label: 'Chờ duyệt', value: 1234, href: '/moderation' },
          { id: 'b', label: 'Khẩn cấp', value: 3, isUrgent: true, isActive: true, onClick: () => undefined },
          { id: 'c', label: 'Quá hạn', value: undefined },
        ]}
      />,
    );
    expect(html).toContain('href="/moderation"');
    expect(html).toContain('1.234');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('text-coral-ink');
    expect(html).toContain('—');
  });

  it('số 0 không tô màu cảnh báo', () => {
    const html = renderToStaticMarkup(
      <MetricStrip label="Số liệu" items={[{ id: 'a', label: 'Khẩn cấp', value: 0, isUrgent: true }]} />,
    );
    expect(html).not.toContain('text-coral-ink');
  });
});

describe('Tabs', () => {
  it('tablist đúng ARIA: chỉ tab đang chọn nằm trong thứ tự Tab', () => {
    const html = renderToStaticMarkup(
      <Tabs
        label="Mục"
        idPrefix="x"
        active="roles"
        onChange={() => undefined}
        tabs={[
          { id: 'users', label: 'Người dùng' },
          { id: 'roles', label: 'Vai trò', count: 2 },
        ]}
      />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(1);
    expect(html).toContain('aria-controls="x-panel-roles"');
  });
});

describe('Pagination', () => {
  it('hiển thị khoảng đang xem và khoá nút ở trang đầu', () => {
    const html = renderToStaticMarkup(<Pagination page={1} pageSize={20} total={134} onPageChange={() => undefined} />);
    expect(html).toContain('1–20 / 134');
    expect(html).toContain('1 / 7');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Trang trước/);
  });

  it('trang cuối cắt đúng số bản ghi và khoá nút sau', () => {
    const html = renderToStaticMarkup(<Pagination page={7} pageSize={20} total={134} onPageChange={() => undefined} />);
    expect(html).toContain('121–134 / 134');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Trang sau/);
  });

  it('không có dữ liệu thì hiển thị 0–0', () => {
    const html = renderToStaticMarkup(<Pagination page={1} pageSize={20} total={0} onPageChange={() => undefined} />);
    expect(html).toContain('0–0 / 0');
  });
});

describe('StatusBadge', () => {
  it('có chữ kèm chấm màu; tone khẩn cấp không có chấm', () => {
    const normal = renderToStaticMarkup(<StatusBadge tone="success">Hoạt động</StatusBadge>);
    expect(normal).toContain('Hoạt động');
    expect(normal).toContain('aria-hidden="true"');
    const urgent = renderToStaticMarkup(<StatusBadge tone="urgent">Khẩn cấp</StatusBadge>);
    expect(urgent).not.toContain('aria-hidden');
  });
});
