import type { ModerationLogDto } from '@tripflix/api-client/core-api/model/index';

// CSV mở trong Excel phải giữ dữ liệu dưới dạng văn bản, không thực thi công thức.
export function csvCell(value: string): string {
  const safe = /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function exportModerationCsv(items: ModerationLogDto[]) {
  const keys = [
    'id',
    'createdAt',
    'targetType',
    'postId',
    'commentId',
    'action',
    'reasonCode',
    'reasonDetail',
    'moderatorId',
  ] as const;
  const content =
    '\uFEFF' +
    [keys.join(','), ...items.map((item) => keys.map((key) => csvCell(item[key] ?? '')).join(','))].join(
      '\r\n',
    );
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `moderation-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
