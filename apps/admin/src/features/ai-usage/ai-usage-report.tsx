'use client';

import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { FilterToolbar, SelectField } from '@/ui/filter-toolbar';
import { TabPanel, Tabs } from '@/ui/tabs';
import { AiUsageOverview } from './ai-usage-overview';
import { AiUsageTraces } from './ai-usage-traces';
import { AiUsageUsers } from './ai-usage-users';
import { AI_USAGE_RANGES, aiUsageRange, type AiUsageRangeDays } from './ai-usage-range';

const copy = vi.aiUsage;
type TabId = 'overview' | 'users' | 'traces';
const TABS = [
  { id: 'overview', label: copy.tabs.overview },
  { id: 'users', label: copy.tabs.users },
  { id: 'traces', label: copy.tabs.traces },
] as const;

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
    <div className="space-y-4">
      <FilterToolbar>
        <SelectField
          label={copy.range}
          value={String(days)}
          options={AI_USAGE_RANGES.map((value) => ({ value: String(value), label: copy.ranges[value] }))}
          onChange={(value) => setDays(Number(value) as AiUsageRangeDays)}
        />
      </FilterToolbar>
      <Tabs label={copy.tabsLabel} idPrefix="ai-usage" tabs={TABS} active={tab} onChange={setTab} />
      <TabPanel idPrefix="ai-usage" active={tab}>
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
      </TabPanel>
    </div>
  );
}
