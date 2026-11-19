/** Hàm tính cho khối "Toàn hệ thống" trên trang Tổng quan (SCRUM-181). Tách riêng để test không cần React. */

export const SUMMARY_RANGES = [1, 7, 30] as const;
export type SummaryRangeDays = (typeof SUMMARY_RANGES)[number];

/** Tổng số đơn bất thường của mọi loại; API trả số theo từng loại. */
export function sumAnomalies(counts: Partial<Record<string, number>> | undefined): number | undefined {
  if (!counts) return undefined;
  return Object.values(counts).reduce<number>((total, value) => total + (value ?? 0), 0);
}

/** Số lượt chạy lỗi trong các lượt gần nhất của mọi job, giống cách tab Job nền đếm. */
export function countFailedRuns(
  groups: readonly ({ jobs: readonly { runs: readonly { outcome: string }[] }[] } | undefined)[],
): number | undefined {
  if (groups.some((group) => !group)) return undefined;
  return groups.reduce(
    (total, group) =>
      total + (group?.jobs.flatMap((job) => job.runs).filter((run) => run.outcome === 'failed').length ?? 0),
    0,
  );
}

const percent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

/** Tỉ lệ lỗi dạng phần (0.0123) sang "1,23%"; null khi chưa có số liệu. */
export function formatErrorRate(rate: number | null | undefined): string | undefined {
  if (rate === undefined) return undefined;
  return rate === null ? '—' : `${percent.format(rate * 100)}%`;
}

const whole = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/**
 * Số request lấy từ Prometheus là số thực (increase nội suy), nên làm tròn; chưa tải thì undefined,
 * chưa có số liệu thì gạch ngang.
 */
export function formatRequests(requests: number | null | undefined): string | undefined {
  if (requests === undefined) return undefined;
  return requests === null ? '—' : whole.format(Math.round(requests));
}
