'use client';
import * as adminCommerce from '@tripflix/api-client/core-api/admin-commerce/admin-commerce';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { FilterToolbar, SearchField, SelectField } from '@/ui/filter-toolbar';
import { MetricStrip } from '@/ui/metric-strip';
import { LoadMore } from '@/ui/pagination';
import { EmptyState } from '@/ui/states';
import { StatusBadge, type StatusTone } from '@/ui/status-badge';
import { TabPanel, Tabs } from '@/ui/tabs';
import { readEnumParam } from '@/ui/url-params';
import { useDetailParam } from '@/ui/use-detail-param';
import { useUrlParams } from '@/ui/use-url-params';
import { AdminApiError } from '../shell/api-state';
import { OrderDrawer } from './order-drawer';
import { formatDateTime, formatMoney, getStatusLabel, summarizeAnomaly } from './orders-format';
import {
  ANOMALY_KINDS,
  ORDER_STATUSES,
  type AdminOrder,
  type AnomalyList,
  type OrderPage,
} from './orders-types';

const copy = vi.adminOrders;
const PAGE_SIZE = 20;
const TAB_IDS = ['anomalies', 'search'] as const;
const KIND_FILTERS = ['', ...ANOMALY_KINDS] as const;
const STATUS_FILTERS = ['', ...ORDER_STATUSES] as const;

type AnomalyItem = AnomalyList['items'][number];

const statusTone = (status: string): StatusTone =>
  status === 'paid' ? 'success' : status === 'paying' ? 'warning' : status === 'pending' ? 'info' : 'neutral';

export function OrdersWorkspace() {
  const { params, update } = useUrlParams();
  const tab = readEnumParam(params.get('tab'), TAB_IDS, 'anomalies');
  const { openId, open, close, clear } = useDetailParam();
  return (
    <div className="space-y-4">
      <Tabs
        label={vi.admin.orders}
        idPrefix="orders"
        active={tab}
        onChange={(next) =>
          update({ tab: next === 'anomalies' ? null : next, kind: null, q: null, status: null, id: null })
        }
        tabs={[
          { id: 'anomalies', label: copy.tabAnomalies },
          { id: 'search', label: copy.tabSearch },
        ]}
      />
      <TabPanel idPrefix="orders" active={tab}>
        {tab === 'anomalies' ? (
          <AnomalyPanel openId={openId} onOpen={open} onClose={close} onClear={clear} />
        ) : (
          <SearchPanel openId={openId} onOpen={open} onClose={close} onClear={clear} />
        )}
      </TabPanel>
    </div>
  );
}

interface PanelProps {
  openId: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
  onClear: () => void;
}

function AnomalyPanel({ openId, onOpen, onClose, onClear }: PanelProps) {
  const { params, update } = useUrlParams();
  const kind = readEnumParam(params.get('kind'), KIND_FILTERS, '');
  const all = useQuery({
    queryKey: ['admin-anomalies'],
    queryFn: async ({ signal }) =>
      (await adminCommerce.adminOrdersControllerAnomalies(undefined, { signal }))
        .data as unknown as AnomalyList,
  });
  const items = (all.data?.items ?? []).filter((anomaly) => !kind || anomaly.kind === kind);
  const columns: DataColumn<AnomalyItem>[] = [
    { id: 'kind', header: copy.columns.kind, cell: (anomaly) => copy.kinds[anomaly.kind] },
    {
      id: 'code',
      header: copy.columns.code,
      cell: (anomaly) => anomaly.confirmationCode ?? anomaly.orderId.slice(0, 8),
    },
    {
      id: 'status',
      header: copy.columns.status,
      cell: (anomaly) => (
        <StatusBadge tone={statusTone(anomaly.orderStatus)}>{getStatusLabel(anomaly.orderStatus)}</StatusBadge>
      ),
    },
    { id: 'total', header: copy.columns.total, align: 'right', cell: (anomaly) => formatMoney(anomaly.total) },
    {
      id: 'detail',
      header: copy.columns.detail,
      hideBelow: 'md',
      cell: (anomaly) => summarizeAnomaly(anomaly.kind, anomaly.detail),
    },
    {
      id: 'since',
      header: copy.columns.since,
      hideBelow: 'lg',
      cell: (anomaly) => <span className="whitespace-nowrap">{formatDateTime(anomaly.since)}</span>,
    },
  ];
  return (
    <div className="space-y-3">
      <MetricStrip
        label={copy.tabAnomalies}
        items={ANOMALY_KINDS.map((value) => ({
          id: value,
          label: copy.kinds[value],
          value: all.data?.counts[value] ?? (all.isPending ? undefined : 0),
          isUrgent: true,
          isActive: kind === value,
          onClick: () => {
            update({ kind: kind === value ? null : value });
            onClear();
          },
        }))}
      />
      {kind && <p className="text-[13px] text-text-muted">{copy.kindHints[kind]}</p>}
      <AdminApiError error={all.error} retry={() => void all.refetch()} />
      <DataTable
        label={kind ? copy.kinds[kind] : copy.tabAnomalies}
        columns={columns}
        rows={items}
        getRowId={(anomaly) => `${anomaly.kind}-${anomaly.orderId}`}
        onRowOpen={(anomaly) => onOpen(anomaly.orderId)}
        isRowSelected={(anomaly) => anomaly.orderId === openId}
        isLoading={all.isPending}
        empty={!all.error && <EmptyState title={copy.noAnomalies} />}
      />
      {openId && (
        <OrderDrawer
          id={openId}
          ids={[...new Set(items.map((anomaly) => anomaly.orderId))]}
          onOpen={onOpen}
          onClose={onClose}
        />
      )}
    </div>
  );
}

function SearchPanel({ openId, onOpen, onClose, onClear }: PanelProps) {
  const { params, update } = useUrlParams();
  const q = params.get('q') ?? '';
  const status = readEnumParam(params.get('status'), STATUS_FILTERS, '');
  const pages = useInfiniteQuery({
    queryKey: ['admin-orders', { q, status }],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) =>
      (
        await adminCommerce.adminOrdersControllerSearch(
          {
            q: q || undefined,
            status: status || undefined,
            before: pageParam,
            limit: PAGE_SIZE,
          },
          { signal },
        )
      ).data as unknown as OrderPage,
    getNextPageParam: (page) => page.nextBefore ?? undefined,
  });
  const orders = pages.data?.pages.flatMap((page) => page.items) ?? [];
  const columns: DataColumn<AdminOrder>[] = [
    { id: 'code', header: copy.columns.code, cell: (order) => order.confirmationCode ?? order.id.slice(0, 8) },
    {
      id: 'status',
      header: copy.columns.status,
      cell: (order) => <StatusBadge tone={statusTone(order.status)}>{getStatusLabel(order.status)}</StatusBadge>,
    },
    { id: 'total', header: copy.columns.total, align: 'right', cell: (order) => formatMoney(order.total) },
    {
      id: 'contact',
      header: copy.columns.contact,
      hideBelow: 'md',
      cell: (order) =>
        [order.contactName, order.contactPhone, order.contactEmail].filter(Boolean).join(' · ') || '—',
    },
    {
      id: 'createdAt',
      header: copy.columns.createdAt,
      hideBelow: 'lg',
      cell: (order) => <span className="whitespace-nowrap">{formatDateTime(order.createdAt)}</span>,
    },
  ];
  return (
    <div className="space-y-3">
      <FilterToolbar
        hasActiveFilters={!!(q || status)}
        onReset={() => {
          update({ q: null, status: null });
          onClear();
        }}
      >
        <SearchField
          label={copy.searchLabel}
          placeholder={copy.searchPlaceholder}
          value={q}
          onChange={(value) => update({ q: value })}
          className="max-w-96"
        />
        <SelectField
          label={copy.statusLabel}
          value={status}
          allLabel={copy.allStatuses}
          options={ORDER_STATUSES.map((value) => ({ value, label: copy.status[value] }))}
          onChange={(value) => update({ status: value })}
        />
      </FilterToolbar>
      <AdminApiError error={pages.error} retry={() => void pages.refetch()} />
      <DataTable
        label={copy.tabSearch}
        columns={columns}
        rows={orders}
        getRowId={(order) => order.id}
        onRowOpen={(order) => onOpen(order.id)}
        selectedId={openId}
        isLoading={pages.isPending}
        empty={!pages.error && <EmptyState title={copy.noOrders} />}
      />
      {orders.length > 0 && (
        <LoadMore
          shown={orders.length}
          hasMore={!!pages.hasNextPage}
          isFetching={pages.isFetchingNextPage}
          onLoadMore={() => void pages.fetchNextPage()}
        />
      )}
      {openId && (
        <OrderDrawer id={openId} ids={orders.map((order) => order.id)} onOpen={onOpen} onClose={onClose} />
      )}
    </div>
  );
}
