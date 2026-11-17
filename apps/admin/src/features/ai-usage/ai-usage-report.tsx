'use client';

import { useQuery } from '@tanstack/react-query';
import { aiUsageControllerGetAiUsage } from '@tripflix/api-client/core-api/analytics/analytics';
import type { AiUsageControllerGetAiUsageGroupBy } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';
import { AI_USAGE_RANGES, aiUsageRange, formatUsd, type AiUsageRangeDays } from './ai-usage-range';

const copy = vi.aiUsage;
const GROUPS = Object.keys(copy.groups) as AiUsageControllerGetAiUsageGroupBy[];
const count = new Intl.NumberFormat('vi-VN');

/** Tên nhóm cho người đọc: tính năng dịch sang tiếng Việt, ngày và model giữ nguyên. */
const groupLabel = (groupBy: AiUsageControllerGetAiUsageGroupBy, key: string) =>
  groupBy === 'feature' ? (copy.features[key as keyof typeof copy.features] ?? key) : key;

/** Chi phí gọi AI theo tính năng, ngày hoặc model (TF95). Chỉ superadmin; API tự chặn người khác. */
export function AiUsageReport() {
  const [days, setDays] = useState<AiUsageRangeDays>(7);
  const [groupBy, setGroupBy] = useState<AiUsageControllerGetAiUsageGroupBy>('feature');
  const [openedAt] = useState(() => Date.now()); // mở trang qua nửa đêm thì tải lại để có ngày mới
  const params = { ...aiUsageRange(days, openedAt), groupBy };
  const report = useQuery({
    queryKey: ['admin', 'ai-usage', params],
    queryFn: async ({ signal }) => (await aiUsageControllerGetAiUsage(params, { signal })).data,
    retry: false,
  });
  const data = report.isError ? undefined : report.data;

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <span className="admin-badge">{data ? formatUsd(data.total.costUsd) : vi.api.loading}</span>
      </div>
      <form className="admin-filters" onSubmit={(event) => event.preventDefault()}>
        <label>
          {copy.range}
          <select value={days} onChange={(event) => setDays(Number(event.target.value) as AiUsageRangeDays)}>
            {AI_USAGE_RANGES.map((value) => (
              <option key={value} value={value}>
                {copy.ranges[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.groupBy}
          <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as AiUsageControllerGetAiUsageGroupBy)}>
            {GROUPS.map((value) => (
              <option key={value} value={value}>
                {copy.groups[value]}
              </option>
            ))}
          </select>
        </label>
      </form>
      {report.isError && <AdminApiError error={report.error} retry={() => void report.refetch()} />}
      {report.isPending && <output>{vi.api.loading}</output>}
      {data && (
        <section className="admin-data" aria-label={copy.title}>
          {data.rows.length === 0 ? (
            <output className="admin-empty">{copy.empty}</output>
          ) : (
            <div className="admin-table-scroll">
              <table aria-label={copy.title}>
                <thead>
                  <tr>
                    <th scope="col">{copy.groups[groupBy]}</th>
                    <th scope="col">{copy.columns.calls}</th>
                    <th scope="col">{copy.columns.inputTokens}</th>
                    <th scope="col">{copy.columns.outputTokens}</th>
                    <th scope="col">{copy.columns.costUsd}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.key}>
                      <td>{groupLabel(groupBy, row.key)}</td>
                      <td>{count.format(row.calls)}</td>
                      <td>{count.format(row.inputTokens)}</td>
                      <td>{count.format(row.outputTokens)}</td>
                      <td>{formatUsd(row.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">{copy.total}</th>
                    <td>{count.format(data.total.calls)}</td>
                    <td>{count.format(data.total.inputTokens)}</td>
                    <td>{count.format(data.total.outputTokens)}</td>
                    <td>{formatUsd(data.total.costUsd)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="admin-helper">{copy.estimated}</p>
        </section>
      )}
    </>
  );
}
