'use client';
import * as adminCommerce from '@tripflix/api-client/core-api/admin-commerce/admin-commerce';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { FilterToolbar, SearchField, SelectField } from '@/ui/filter-toolbar';
import { MetricStrip } from '@/ui/metric-strip';
import { LoadMore } from '@/ui/pagination';
import { EmptyState } from '@/ui/states';
import { StatusBadge, type StatusTone } from '@/ui/status-badge';
import { TabPanel, Tabs } from '@/ui/tabs';
import { readEnumParam } from '@/ui/url-params';
import { useUrlParams } from '@/ui/use-url-params';
import { AdminApiError } from '../shell/api-state';
import { LoadingState, Panel } from '../shell/operations-ui';
import { formatDateTime, formatMoney, getStatusLabel, summarizeAnomaly } from './orders-format';
import {
  ANOMALY_KINDS,
  ORDER_STATUSES,
  type AdminOrder,
  type AnomalyList,
  type OrderDetail,
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
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <Tabs
        label={vi.admin.orders}
        idPrefix="orders"
        active={tab}
        onChange={(next) => update({ tab: next === 'anomalies' ? null : next, kind: null, q: null, status: null })}
        tabs={[
          { id: 'anomalies', label: copy.tabAnomalies },
          { id: 'search', label: copy.tabSearch },
        ]}
      />
      <TabPanel idPrefix="orders" active={tab}>
        {tab === 'anomalies' ? (
          <AnomalyPanel onOpen={setOpenOrderId} />
        ) : (
          <SearchPanel onOpen={setOpenOrderId} />
        )}
      </TabPanel>
      {openOrderId && <OrderDetailPanel id={openOrderId} onClose={() => setOpenOrderId(null)} />}
    </div>
  );
}

function AnomalyPanel({ onOpen }: { onOpen: (id: string) => void }) {
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
          onClick: () => update({ kind: kind === value ? null : value }),
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
        isLoading={all.isPending}
        empty={!all.error && <EmptyState title={copy.noAnomalies} />}
      />
    </div>
  );
}

function SearchPanel({ onOpen }: { onOpen: (id: string) => void }) {
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
      <FilterToolbar hasActiveFilters={!!(q || status)} onReset={() => update({ q: null, status: null })}>
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
    </div>
  );
}

function OrderDetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useQuery({
    queryKey: ['admin-order', id],
    queryFn: async ({ signal }) =>
      (await adminCommerce.adminOrdersControllerDetail(id, { signal })).data as unknown as OrderDetail,
  });
  const data = detail.data;
  return (
    <Panel
      title={`${copy.detailTitle} ${data?.order.confirmationCode ?? ''}`}
      action={
        <button className="admin-secondary" onClick={onClose}>
          {copy.close}
        </button>
      }
    >
      <AdminApiError error={detail.error} retry={() => void detail.refetch()} />
      {detail.isPending && <LoadingState />}
      {data && (
        <div className="grid gap-5 p-5 text-sm">
          <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <Field label={copy.orderId} value={data.order.id} />
            <Field label={copy.userId} value={data.order.userId} />
            <Field label={copy.columns.status} value={getStatusLabel(data.order.status)} />
            <Field label={copy.columns.total} value={formatMoney(data.order.total)} />
            <Field label={copy.columns.createdAt} value={formatDateTime(data.order.createdAt)} />
            <Field label={copy.paidAt} value={formatDateTime(data.order.paidAt)} />
            <Field
              label={copy.columns.contact}
              value={
                [data.order.contactName, data.order.contactPhone, data.order.contactEmail]
                  .filter(Boolean)
                  .join(' · ') || '—'
              }
            />
          </dl>
          <Section
            title={copy.anomaliesOfOrder}
            rows={data.anomalies.map((a) => [
              copy.kinds[a.kind],
              summarizeAnomaly(a.kind, a.detail),
              copy.kindHints[a.kind],
            ])}
          />
          <Section
            title={copy.items}
            rows={data.items.map((item) => [
              item.productName,
              `${item.date}${item.productType === 'room' ? ` · ${item.nights} ${copy.nights}` : ''} · x${item.qty}`,
              formatMoney(item.lineTotal),
              item.confirmationCode ?? '—',
            ])}
          />
          <Section
            title={copy.guests}
            rows={data.guests.map((guest) => [
              guest.fullName,
              guest.passengerType ?? '',
              guest.birthdate ?? '',
            ])}
          />
          <Section
            title={copy.payments}
            rows={data.payments.map((p) => [
              p.gateway,
              p.status,
              formatMoney(p.amount),
              p.gatewayRef ?? p.failureCode ?? '',
              p.needsReview ? copy.needsReview : '',
              formatDateTime(p.createdAt),
            ])}
          />
          <Section
            title={copy.refunds}
            rows={data.refunds.map((r) => [
              r.reason,
              r.status,
              formatMoney(r.amount),
              r.gatewayRef ?? '',
              r.needsReview ? copy.needsReview : '',
              formatDateTime(r.createdAt),
            ])}
          />
          <Section
            title={copy.history}
            rows={data.history.map((h) => [
              `${h.fromStatus ? getStatusLabel(h.fromStatus) : '—'} → ${getStatusLabel(h.toStatus)}`,
              h.source ?? '',
              h.requestId ?? '',
              formatDateTime(h.createdAt),
            ])}
          />
        </div>
      )}
    </Panel>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="break-all font-medium">{value}</dd>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-text-muted">{copy.none}</p>
      ) : (
        <div className="admin-table-scroll">
          <table>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
