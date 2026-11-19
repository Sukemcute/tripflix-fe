'use client';

import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AiUsageOverview } from './ai-usage-overview';
import { AiUsageTabs, type AiUsageTabItem } from './ai-usage-tabs';
import { AiUsageTraces } from './ai-usage-traces';
import { AiUsageUsers } from './ai-usage-users';
import { AI_USAGE_RANGES, aiUsageRange, type AiUsageRangeDays } from './ai-usage-range';

const copy = vi.aiUsage;
type TabId = 'overview' | 'users' | 'traces';
const TABS: readonly AiUsageTabItem<TabId>[] = [
  { id: 'overview', label: copy.tabs.overview },
  { id: 'users', label: copy.tabs.users },
  { id: 'traces', label: copy.tabs.traces },
];

/**
 * Chi phí và trace AI (TF95, SCRUM-179): tổng quan lưu lượng, người dùng tốn nhiều nhất, trace từng lượt chat.
 * Chỉ superadmin; API tự chặn người khác.
 */
export function AiUsageReport() {
  const [tab, setTab] = useState<TabId>('overview');
  const [days, setDays] = useState<AiUsageRangeDays>(7);
  const [traceUser, setTraceUser] = useState<{ userId: string; name: string } | null>(null);
  const [openedAt] = useState(() => Date.now()); // mở trang qua nửa đêm thì tải lại để có ngày mới
  const range = aiUsageRange(days, openedAt);

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
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
      </form>
      <AiUsageTabs label={copy.tabsLabel} tabs={TABS} active={tab} onChange={setTab}>
        {tab === 'overview' && <AiUsageOverview key={days} range={range} days={days} />}
        {tab === 'users' && (
          <AiUsageUsers
            key={days}
            range={range}
            onOpenTraces={(user) => {
              setTraceUser(user);
              setTab('traces');
            }}
          />
        )}
        {tab === 'traces' && (
          <AiUsageTraces
            key={`${days}-${traceUser?.userId ?? 'all'}`}
            range={range}
            user={traceUser}
            onClearUser={() => setTraceUser(null)}
          />
        )}
      </AiUsageTabs>
    </>
  );
}
