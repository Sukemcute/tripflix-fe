'use client';

import { useQuery } from '@tanstack/react-query';
import { adminVocabGapsControllerList } from '@tripflix/api-client/core-api/admin-search-vocab-gaps/admin-search-vocab-gaps';
import { t, vi } from '@tripflix/i18n';
import { useState } from 'react';
import { SelectField } from '@/ui/filter-toolbar';
import { EmptyState, LoadingState } from '@/ui/states';
import { StatusBadge } from '@/ui/status-badge';
import { AdminApiError } from '../shell/api-state';
import { Panel } from '../shell/operations-ui';

const copy = vi.discoveryJobs.vocabGaps;
const DAY_OPTIONS = [1, 7, 30, 90] as const;

/** Chỉ để xem: BE đã sắp điểm cao nhất trước, không phân trang. */
export function VocabGaps() {
  const [days, setDays] = useState(7);
  const gaps = useQuery({
    queryKey: ['admin', 'vocab-gaps', days],
    // Client sinh ra gõ kiểu cả nhánh 400 (data: void) dù http() đã ném lỗi khi không ok.
    queryFn: async ({ signal }) =>
      (await adminVocabGapsControllerList({ days }, { signal })).data || undefined,
    retry: false,
  });
  const data = gaps.isError ? undefined : gaps.data;

  return (
    <Panel
      title={copy.title}
      description={copy.description}
      action={
        <div className="flex items-center gap-3">
          {data && (
            <StatusBadge>
              {t('discoveryJobs.vocabGaps.summary', {
                queries: data.queries.toLocaleString('vi-VN'),
                days: data.days,
              })}
            </StatusBadge>
          )}
          <SelectField
            label={copy.days}
            value={String(days)}
            options={DAY_OPTIONS.map((d) => ({
              value: String(d),
              label: t('discoveryJobs.vocabGaps.daysOption', { days: d }),
            }))}
            onChange={(value) => setDays(Number(value))}
          />
        </div>
      }
    >
      {gaps.isError && <AdminApiError error={gaps.error} retry={() => void gaps.refetch()} />}
      {gaps.isPending && <LoadingState />}
      {data && !data.items.length && <EmptyState title={copy.empty} />}
      {data && data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="ops-table" aria-label={copy.title}>
            <thead>
              <tr>
                <th scope="col">{copy.columns.gram}</th>
                <th scope="col" className="text-right">{copy.columns.queryHits}</th>
                <th scope="col" className="text-right">{copy.columns.contentCount}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((gap) => (
                <tr key={gap.gram}>
                  <td>
                    <details>
                      <summary aria-label={gap.gram} className="cursor-pointer focus-visible:outline-2 focus-visible:outline-teal">
                        <code>{gap.gram}</code>{' '}
                        {gap.samples[0] && <span className="text-text-muted">“{gap.samples[0]}”</span>}
                      </summary>
                      <p className="mt-2 text-xs text-text-muted">
                        {copy.variants}: {gap.variants.map((v) => `${v.gram} (${v.queryHits})`).join(', ')}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">{copy.samples}:</p>
                      <ul className="list-disc pl-5 text-xs text-text-muted">
                        {gap.samples.slice(0, 5).map((sample) => (
                          <li key={sample}>{sample}</li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  <td className="text-right tabular-nums">{gap.queryHits.toLocaleString('vi-VN')}</td>
                  <td className="text-right tabular-nums">{gap.contentCount.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
