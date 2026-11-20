'use client';
import * as adminCommerce from '@tripflix/api-client/core-api/admin-commerce/admin-commerce';
import { HttpError } from '@tripflix/api-client';
import { useQuery } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { DataTable, type DataColumn } from '@/ui/data-table';
import { DetailDrawer } from '@/ui/detail-drawer';
import { DetailSection, KeyValueList } from '@/ui/detail-parts';
import { LoadingState } from '@/ui/states';
import { StatusBadge, type StatusTone } from '@/ui/status-badge';
import { TabPanel, Tabs } from '@/ui/tabs';
import { buildDrawerNavigation } from '@/ui/use-detail-param';
import { AdminApiError } from '../shell/api-state';
import { formatDateTime, formatMoney, getStatusLabel, summarizeAnomaly } from './orders-format';
import type { OrderDetail } from './orders-types';

const copy = vi.adminOrders;
const columnCopy = copy.detailColumns;
const TAB_IDS = ['overview', 'items', 'payments', 'history'] as const;
type OrderTab = (typeof TAB_IDS)[number];

const statusTone = (status: string): StatusTone =>
  status === 'paid' ? 'success' : status === 'paying' ? 'warning' : status === 'pending' ? 'info' : 'neutral';

const emptyNote = <p className="text-[13px] text-text-muted">{copy.none}</p>;
const reviewFlag = (needsReview: boolean) =>
  needsReview ? <StatusBadge tone="warning">{copy.needsReview}</StatusBadge> : null;
const time = (value: string) => <span className="whitespace-nowrap">{formatDateTime(value)}</span>;

const itemColumns: DataColumn<OrderDetail['items'][number]>[] = [
  {
    id: 'product',
    header: columnCopy.product,
    cell: (item) => (
      <>
        <span className="block">{item.productName}</span>
        <span className="block text-xs text-text-muted">
          {item.date}
          {item.productType === 'room' ? ` · ${item.nights} ${copy.nights}` : ''}
        </span>
      </>
    ),
  },
  { id: 'qty', header: columnCopy.quantity, align: 'right', cell: (item) => item.qty },
  { id: 'total', header: columnCopy.amount, align: 'right', cell: (item) => formatMoney(item.lineTotal) },
  { id: 'code', header: columnCopy.itemCode, cell: (item) => item.confirmationCode ?? '—' },
];

const guestColumns: DataColumn<OrderDetail['guests'][number]>[] = [
  { id: 'name', header: columnCopy.guestName, cell: (guest) => guest.fullName },
  { id: 'type', header: columnCopy.passengerType, cell: (guest) => guest.passengerType ?? '—' },
  { id: 'birthdate', header: columnCopy.birthdate, cell: (guest) => guest.birthdate ?? '—' },
];

const paymentColumns: DataColumn<OrderDetail['payments'][number]>[] = [
  { id: 'gateway', header: columnCopy.gateway, cell: (payment) => payment.gateway },
  { id: 'status', header: columnCopy.status, cell: (payment) => payment.status },
  { id: 'amount', header: columnCopy.amount, align: 'right', cell: (payment) => formatMoney(payment.amount) },
  {
    id: 'ref',
    header: columnCopy.reference,
    cell: (payment) => (
      <span className="block max-w-40 truncate font-mono text-xs">
        {payment.gatewayRef ?? payment.failureCode ?? '—'}
      </span>
    ),
  },
  { id: 'review', header: <span className="sr-only">{copy.needsReview}</span>, cell: (payment) => reviewFlag(payment.needsReview) },
  { id: 'time', header: columnCopy.time, cell: (payment) => time(payment.createdAt) },
];

const refundColumns: DataColumn<OrderDetail['refunds'][number]>[] = [
  { id: 'reason', header: columnCopy.reason, cell: (refund) => refund.reason },
  { id: 'status', header: columnCopy.status, cell: (refund) => refund.status },
  { id: 'amount', header: columnCopy.amount, align: 'right', cell: (refund) => formatMoney(refund.amount) },
  {
    id: 'ref',
    header: columnCopy.reference,
    cell: (refund) => (
      <span className="block max-w-40 truncate font-mono text-xs">{refund.gatewayRef ?? '—'}</span>
    ),
  },
  { id: 'review', header: <span className="sr-only">{copy.needsReview}</span>, cell: (refund) => reviewFlag(refund.needsReview) },
  { id: 'time', header: columnCopy.time, cell: (refund) => time(refund.createdAt) },
];

const historyColumns: DataColumn<OrderDetail['history'][number]>[] = [
  {
    id: 'change',
    header: columnCopy.change,
    cell: (entry) =>
      `${entry.fromStatus ? getStatusLabel(entry.fromStatus) : '—'} → ${getStatusLabel(entry.toStatus)}`,
  },
  { id: 'source', header: columnCopy.source, cell: (entry) => entry.source ?? '—' },
  {
    id: 'requestId',
    header: columnCopy.requestId,
    hideBelow: 'sm',
    cell: (entry) => <span className="block max-w-36 truncate font-mono text-xs">{entry.requestId ?? '—'}</span>,
  },
  { id: 'time', header: columnCopy.time, cell: (entry) => time(entry.createdAt) },
];

/** Chi tiết một đơn trong drawer: mở từ bảng mà không rời danh sách; có hồ sơ trước/sau và 4 nhóm thông tin. */
export function OrderDrawer({
  id,
  ids,
  onOpen,
  onClose,
}: {
  id: string;
  /** Mã đơn theo thứ tự danh sách đang hiển thị, để chuyển trước/sau. */
  ids: readonly string[];
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<OrderTab>('overview');
  const detail = useQuery({
    queryKey: ['admin-order', id],
    queryFn: async ({ signal }) =>
      (await adminCommerce.adminOrdersControllerDetail(id, { signal })).data as unknown as OrderDetail,
  });
  const data = detail.data;
  const isNotFound = detail.error instanceof HttpError && detail.error.status === 404;
  const order = data?.order;

  return (
    <DetailDrawer
      size="wide"
      title={order ? (order.confirmationCode ?? order.id.slice(0, 8)) : id.slice(0, 8)}
      status={order && <StatusBadge tone={statusTone(order.status)}>{getStatusLabel(order.status)}</StatusBadge>}
      subtitle={order && `${formatMoney(order.total)} · ${formatDateTime(order.createdAt)}`}
      navigation={buildDrawerNavigation(ids, id, onOpen)}
      scrollKey={id}
      onClose={onClose}
      tabs={
        <Tabs
          label={copy.detailTitle}
          idPrefix="order"
          active={tab}
          onChange={setTab}
          tabs={TAB_IDS.map((value) => ({ id: value, label: copy.detailTabs[value] }))}
        />
      }
    >
      {isNotFound ? (
        <p role="alert" className="text-[13px] text-text-muted">
          {vi.adminOperations.drawer.notFound}
        </p>
      ) : (
        <AdminApiError error={detail.error} retry={() => void detail.refetch()} />
      )}
      {detail.isPending && <LoadingState rows={5} />}
      {data && order && (
        <TabPanel idPrefix="order" active={tab}>
          {tab === 'overview' && (
            <>
              <DetailSection title={copy.detailTitle}>
                <KeyValueList
                  items={[
                    { label: copy.orderId, value: order.id, isCode: true },
                    { label: copy.userId, value: order.userId, isCode: true },
                    { label: copy.columns.status, value: getStatusLabel(order.status) },
                    { label: copy.columns.total, value: formatMoney(order.total) },
                    { label: copy.columns.createdAt, value: formatDateTime(order.createdAt) },
                    { label: copy.paidAt, value: formatDateTime(order.paidAt) },
                    {
                      label: copy.columns.contact,
                      value: [order.contactName, order.contactPhone, order.contactEmail].filter(Boolean).join(' · '),
                    },
                  ]}
                />
              </DetailSection>
              <DetailSection title={copy.anomaliesOfOrder}>
                {data.anomalies.length === 0 ? (
                  emptyNote
                ) : (
                  <ul className="space-y-3">
                    {data.anomalies.map((anomaly) => (
                      <li key={anomaly.kind} className="text-[13px]">
                        <p>{copy.kinds[anomaly.kind]}</p>
                        <p className="text-text-muted">{summarizeAnomaly(anomaly.kind, anomaly.detail)}</p>
                        <p className="text-xs text-text-muted">{copy.kindHints[anomaly.kind]}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailSection>
            </>
          )}
          {tab === 'items' && (
            <>
              <DetailSection title={copy.items}>
                <DataTable
                  label={copy.items}
                  columns={itemColumns}
                  rows={data.items}
                  getRowId={(item) => item.id}
                  empty={emptyNote}
                />
              </DetailSection>
              <DetailSection title={copy.guests}>
                <DataTable
                  label={copy.guests}
                  columns={guestColumns}
                  rows={data.guests}
                  getRowId={(guest) => `${guest.fullName}-${guest.birthdate ?? ''}`}
                  empty={emptyNote}
                />
              </DetailSection>
            </>
          )}
          {tab === 'payments' && (
            <>
              <DetailSection title={copy.payments}>
                <DataTable
                  label={copy.payments}
                  columns={paymentColumns}
                  rows={data.payments}
                  getRowId={(payment) => payment.id}
                  empty={emptyNote}
                />
              </DetailSection>
              <DetailSection title={copy.refunds}>
                <DataTable
                  label={copy.refunds}
                  columns={refundColumns}
                  rows={data.refunds}
                  getRowId={(refund) => refund.id}
                  empty={emptyNote}
                />
              </DetailSection>
            </>
          )}
          {tab === 'history' && (
            <DetailSection title={copy.history}>
              <DataTable
                label={copy.history}
                columns={historyColumns}
                rows={data.history}
                getRowId={(entry) => `${entry.createdAt}-${entry.toStatus}`}
                empty={emptyNote}
              />
            </DetailSection>
          )}
        </TabPanel>
      )}
    </DetailDrawer>
  );
}
