'use client';

import { cn } from '@tripflix/ui-web';
import type { MouseEvent, ReactNode } from 'react';

export interface DataColumn<Row> {
  id: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  align?: 'left' | 'right';
  /** Ẩn cột khi màn hình hẹp hơn mốc này (cột phụ), thay vì bắt cuộn ngang. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Tên truy cập của nút mở hồ sơ ở ô này (mặc định là nội dung ô). */
  openLabel?: (row: Row) => string;
}

// Tailwind cần thấy nguyên tên class nên liệt kê tường minh.
const HIDE_BELOW = {
  sm: 'max-sm:hidden',
  md: 'max-md:hidden',
  lg: 'max-lg:hidden',
  xl: 'max-xl:hidden',
} as const;

const INTERACTIVE = 'button, a, input, select, textarea, label, [role="menuitem"]';

export interface DataTableProps<Row> {
  /** Nhãn truy cập của bảng. */
  label: string;
  columns: readonly DataColumn<Row>[];
  rows: readonly Row[];
  getRowId: (row: Row) => string;
  /** Có thì cả hàng bấm được để mở chi tiết; ô đầu là nút thật cho bàn phím và trình đọc màn hình. */
  onRowOpen?: (row: Row) => void;
  selectedId?: string | null;
  /** Khi nhiều dòng cùng thuộc một hồ sơ: quyết định dòng nào được tô chọn (thay cho selectedId). */
  isRowSelected?: (row: Row) => boolean;
  /** Cột chứa nút mở hồ sơ (mặc định cột đầu). */
  openColumnId?: string;
  rowClassName?: (row: Row) => string | undefined;
  /** Thuộc tính data-* thêm vào hàng (ví dụ đánh dấu hồ sơ mới để cuộn tới). */
  rowProps?: (row: Row) => Record<`data-${string}`, string | boolean | undefined>;
  isLoading?: boolean;
  loadingRows?: number;
  /** Hiển thị khi không có dòng nào và không đang tải. */
  empty?: ReactNode;
  className?: string;
}

/**
 * Bảng dữ liệu chung: hàng 36px+, đường kẻ mảnh, không viền thẻ. Cột phụ tự ẩn khi hẹp.
 * Hàng đang chọn có vạch teal-ink bên trái (dấu hiệu nhận biết của Admin).
 */
export function DataTable<Row>({
  label,
  columns,
  rows,
  getRowId,
  onRowOpen,
  selectedId,
  isRowSelected,
  openColumnId,
  rowClassName,
  rowProps,
  isLoading = false,
  loadingRows = 6,
  empty,
  className,
}: DataTableProps<Row>) {
  const showSkeleton = isLoading && rows.length === 0;
  const showEmpty = !isLoading && rows.length === 0;
  const cellClass = (column: DataColumn<Row>) =>
    cn(
      column.align === 'right' && 'text-right tabular-nums',
      column.hideBelow && HIDE_BELOW[column.hideBelow],
      column.className,
    );
  const openRow = (event: MouseEvent<HTMLTableRowElement>, row: Row) => {
    if (!onRowOpen) return;
    // Bấm vào nút/liên kết/ô nhập trong hàng thì để chính phần tử đó xử lý.
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    onRowOpen(row);
  };

  return (
    <div className={cn('min-w-0', className)}>
      <div className="overflow-x-auto border-y border-border">
        <table className="w-full border-collapse text-left text-[13px]" aria-label={label} aria-busy={isLoading}>
          <thead>
            <tr className="bg-surface">
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    'h-9 border-b border-border px-3 text-xs font-normal whitespace-nowrap text-text-muted',
                    cellClass(column),
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {showSkeleton &&
              Array.from({ length: loadingRows }, (_, index) => (
                <tr key={index} aria-hidden="true">
                  {columns.map((column, columnIndex) => (
                    // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- ô khung chờ cố ý không có nội dung
                    <td key={column.id} className={cn('h-10 px-3', cellClass(column))}>
                      <div
                        className={cn(
                          'h-4 rounded-adm-sm bg-surface-muted',
                          columnIndex === 0 ? 'w-3/4' : 'w-1/2',
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            {rows.map((row) => {
              const id = getRowId(row);
              const isSelected = isRowSelected ? isRowSelected(row) : selectedId === id;
              return (
                <tr
                  key={id}
                  data-selected={isSelected || undefined}
                  {...rowProps?.(row)}
                  onClick={onRowOpen ? (event) => openRow(event, row) : undefined}
                  className={cn(
                    'transition-colors duration-150 ease-adm motion-reduce:transition-none',
                    onRowOpen && 'cursor-pointer hover:bg-surface',
                    'data-[selected]:bg-surface data-[selected]:shadow-[inset_2px_0_0_var(--color-teal-ink)]',
                    rowClassName?.(row),
                  )}
                >
                  {columns.map((column) => {
                    const content = column.cell(row);
                    return (
                      <td
                        key={column.id}
                        className={cn('border-b border-border/60 px-3 py-2 align-middle', cellClass(column))}
                      >
                        {onRowOpen && column.id === (openColumnId ?? columns[0]?.id) ? (
                          <button
                            type="button"
                            onClick={() => onRowOpen(row)}
                            aria-current={isSelected || undefined}
                            aria-label={column.openLabel?.(row)}
                            className="block w-full rounded-adm-sm text-left"
                          >
                            {content}
                          </button>
                        ) : (
                          content
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showEmpty && empty}
    </div>
  );
}
