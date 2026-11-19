'use client';
import * as adminCommerce from '@tripflix/api-client/core-api/admin-commerce/admin-commerce';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';
import { EmptyState, LoadingState, Metric, Panel } from '../shell/operations-ui';
import { formatDateTime, formatMoney, getStatusLabel, summarizeAnomaly } from './orders-format';
import {
  ANOMALY_KINDS,
  ORDER_STATUSES,
  type AnomalyKind,
  type AnomalyList,
  type OrderDetail,
  type OrderPage,
} from './orders-types';

const copy = vi.adminOrders;
const PAGE_SIZE = 20;

export function OrdersWorkspace() {
  const [tab, setTab] = useState<'anomalies' | 'search'>('anomalies');
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <div className="flex gap-2" role="tablist">
        {(['anomalies', 'search'] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            className={tab === value ? 'admin-primary' : 'admin-secondary'}
            onClick={() => setTab(value)}
          >
            {value === 'anomalies' ? copy.tabAnomalies : copy.tabSearch}
          </button>
        ))}
      </div>
      {tab === 'anomalies' ? (
        <AnomalyPanel onOpen={setOpenOrderId} />
      ) : (
        <SearchPanel onOpen={setOpenOrderId} />
      )}
      {openOrderId && <OrderDetailPanel id={openOrderId} onClose={() => setOpenOrderId(null)} />}
    </div>
  );
}

function AnomalyPanel({ onOpen }: { onOpen: (id: string) => void }) {
  const [kind, setKind] = useState<AnomalyKind | ''>('');
  const all = useQuery({
    queryKey: ['admin-anomalies'],
    queryFn: async ({ signal }) =>
      (await adminCommerce.adminOrdersControllerAnomalies(undefined, { signal }))
        .data as unknown as AnomalyList,
  });
  const items = (all.data?.items ?? []).filter((anomaly) => !kind || anomaly.kind === kind);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ANOMALY_KINDS.map((value) => (
          <button
            key={value}
            className="text-left"
            onClick={() => setKind(kind === value ? '' : value)}
            aria-pressed={kind === value}
          >
            <Metric
              label={copy.kinds[value]}
              value={all.data?.counts[value] ?? (all.isPending ? undefined : 0)}
              urgent={(all.data?.counts[value] ?? 0) > 0}
            />
          </button>
        ))}
      </div>
      <Panel
        title={kind ? copy.kinds[kind] : copy.tabAnomalies}
        description={kind ? copy.kindHints[kind] : copy.description}
      >
        <AdminApiError error={all.error} retry={() => void all.refetch()} />
        {all.isPending ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState title={copy.noAnomalies} />
        ) : (
          <div className="admin-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{copy.columns.kind}</th>
                  <th>{copy.columns.code}</th>
                  <th>{copy.columns.status}</th>
                  <th>{copy.columns.total}</th>
                  <th>{copy.columns.detail}</th>
                  <th>{copy.columns.since}</th>
                  <th>{copy.open}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((anomaly) => (
                  <tr key={`${anomaly.kind}-${anomaly.orderId}`}>
                    <td>{copy.kinds[anomaly.kind]}</td>
                    <td>{anomaly.confirmationCode ?? anomaly.orderId.slice(0, 8)}</td>
                    <td>{getStatusLabel(anomaly.orderStatus)}</td>
                    <td>{formatMoney(anomaly.total)}</td>
                    <td>{summarizeAnomaly(anomaly.kind, anomaly.detail)}</td>
                    <td>{formatDateTime(anomaly.since)}</td>
                    <td>
                      <button className="admin-secondary" onClick={() => onOpen(anomaly.orderId)}>
                        {copy.open}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function SearchPanel({ onOpen }: { onOpen: (id: string) => void }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState({ q: '', status: '' });
  const pages = useInfiniteQuery({
    queryKey: ['admin-orders', filter],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) =>
      (
        await adminCommerce.adminOrdersControllerSearch(
          {
            q: filter.q || undefined,
            status: filter.status || undefined,
            before: pageParam,
            limit: PAGE_SIZE,
          },
          { signal },
        )
      ).data as unknown as OrderPage,
    getNextPageParam: (page) => page.nextBefore ?? undefined,
  });
  const orders = pages.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <Panel title={copy.tabSearch}>
      <form
        className="admin-filters p-5"
        onSubmit={(event) => {
          event.preventDefault();
          setFilter({ q: text.trim(), status });
        }}
      >
        <label>
          {copy.searchLabel}
          <input
            value={text}
            maxLength={200}
            placeholder={copy.searchPlaceholder}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <label>
          {copy.statusLabel}
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{copy.allStatuses}</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {copy.status[value]}
              </option>
            ))}
          </select>
        </label>
        <button className="admin-primary">{copy.search}</button>
      </form>
      <AdminApiError error={pages.error} retry={() => void pages.refetch()} />
      {pages.isPending ? (
        <LoadingState />
      ) : orders.length === 0 ? (
        <EmptyState title={copy.noOrders} />
      ) : (
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>{copy.columns.code}</th>
                <th>{copy.columns.status}</th>
                <th>{copy.columns.total}</th>
                <th>{copy.columns.contact}</th>
                <th>{copy.columns.createdAt}</th>
                <th>{copy.open}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.confirmationCode ?? order.id.slice(0, 8)}</td>
                  <td>{getStatusLabel(order.status)}</td>
                  <td>{formatMoney(order.total)}</td>
                  <td>
                    {[order.contactName, order.contactPhone, order.contactEmail]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </td>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>
                    <button className="admin-secondary" onClick={() => onOpen(order.id)}>
                      {copy.open}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages.hasNextPage && (
        <div className="p-5">
          <button
            className="admin-secondary"
            disabled={pages.isFetchingNextPage}
            onClick={() => void pages.fetchNextPage()}
          >
            {copy.loadMore}
          </button>
        </div>
      )}
    </Panel>
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
