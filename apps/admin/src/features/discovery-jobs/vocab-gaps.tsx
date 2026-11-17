'use client';

import { useQuery } from '@tanstack/react-query';
import { adminVocabGapsControllerList } from '@tripflix/api-client/core-api/admin-search-vocab-gaps/admin-search-vocab-gaps';
import { t, vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';

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
    <section className="admin-data" aria-label={copy.title}>
      <div className="admin-data-heading">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
        {data && (
          <span className="admin-badge">
            {t('discoveryJobs.vocabGaps.summary', {
              queries: data.queries.toLocaleString('vi-VN'),
              days: data.days,
            })}
          </span>
        )}
      </div>
      <div className="admin-filters">
        <label>
          {copy.days}
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {t('discoveryJobs.vocabGaps.daysOption', { days: d })}
              </option>
            ))}
          </select>
        </label>
      </div>
      {gaps.isError && <AdminApiError error={gaps.error} retry={() => void gaps.refetch()} />}
      {gaps.isPending && <output className="admin-empty">{vi.api.loading}</output>}
      {data && !data.items.length && <output className="admin-empty">{copy.empty}</output>}
      {data && data.items.length > 0 && (
        <div className="admin-table-scroll">
          <table aria-label={copy.title}>
            <thead>
              <tr>
                <th>{copy.columns.gram}</th>
                <th>{copy.columns.queryHits}</th>
                <th>{copy.columns.contentCount}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((gap) => (
                <tr key={gap.gram}>
                  <td>
                    <details>
                      <summary aria-label={gap.gram}>
                        <code>{gap.gram}</code>{' '}
                        {gap.samples[0] && <span className="admin-post-muted">“{gap.samples[0]}”</span>}
                      </summary>
                      <p>
                        {copy.variants}: {gap.variants.map((v) => `${v.gram} (${v.queryHits})`).join(', ')}
                      </p>
                      <p>{copy.samples}:</p>
                      <ul>
                        {gap.samples.slice(0, 5).map((sample) => (
                          <li key={sample}>{sample}</li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  <td>{gap.queryHits.toLocaleString('vi-VN')}</td>
                  <td>{gap.contentCount.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
