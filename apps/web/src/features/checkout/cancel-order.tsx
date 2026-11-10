'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commerceApi, createCancelPaidOperation } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { formatPrice } from '@/features/discovery/trip-card';
import { CheckoutError } from './checkout-error';
import styles from './checkout-form.module.css';

const copy = vi.commerce;

/** Huỷ đơn đã thanh toán: xem trước phí và số tiền hoàn, xác nhận rồi mới huỷ. */
export function CancelOrder({ orderId }: { orderId: string }) {
  const client = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  // Giữ một operation để bấm lại sau lỗi mạng gửi đúng Idempotency-Key cũ, không hoàn hai lần.
  const [cancelPaid] = useState(createCancelPaidOperation);
  const quote = useQuery({
    queryKey: ['commerce', 'cancel-quote', orderId],
    enabled: isOpen,
    gcTime: 0,
    queryFn: ({ signal }) => commerceApi.getCancelQuote(orderId, signal),
  });
  const cancel = useMutation({
    retry: false,
    mutationFn: () => cancelPaid(orderId),
    onSuccess: () => {
      // Tải lại đơn để trang chuyển ngay sang màn "Đơn đã huỷ".
      void client.invalidateQueries({ queryKey: ['commerce', 'order', orderId] });
      void client.invalidateQueries({ queryKey: ['commerce', 'trips'] });
    },
  });

  if (cancel.data) {
    return (
      <div className={styles.cancelPanel} role="status">
        <strong>{copy.cancelDone}</strong>
        <p>
          {cancel.data.refundAmount > 0
            ? `${copy.cancelRefundLabel}: ${formatPrice(cancel.data.refundAmount)}. ${copy.cancelRefundStatus[cancel.data.refundStatus as keyof typeof copy.cancelRefundStatus] ?? ''}`
            : copy.cancelNoRefund}
        </p>
        <Link prefetch={false} className="primary-button" href="/bookings">
          {copy.viewTrips}
        </Link>
      </div>
    );
  }
  if (!isOpen) {
    return (
      <button type="button" className={styles.cancelLink} onClick={() => setIsOpen(true)}>
        {copy.cancelOrder}
      </button>
    );
  }

  const details = quote.data?.quote;
  return (
    <div className={styles.cancelPanel}>
      <strong>{copy.cancelTitle}</strong>
      {quote.isPending && <p>{vi.api.loading}</p>}
      <CheckoutError error={quote.error} retry={() => void quote.refetch()} />
      {details && !details.isCancellable && <p role="alert">{copy.cancelBlocked}</p>}
      {details?.isCancellable && (
        <>
          <p className={styles.cancelRow}>
            <span>{copy.cancelFeeLabel}</span>
            <b>{formatPrice(details.feeAmount)}</b>
          </p>
          <p className={styles.cancelRow}>
            <span>{copy.cancelRefundLabel}</span>
            <b>{formatPrice(details.refundAmount)}</b>
          </p>
          <p className={styles.cancelNote}>{copy.cancelNote}</p>
        </>
      )}
      <CheckoutError error={cancel.error} />
      <div className={styles.cancelActions}>
        <button type="button" className="secondary-button" onClick={() => setIsOpen(false)} disabled={cancel.isPending}>
          {copy.cancelKeep}
        </button>
        {details?.isCancellable && (
          <button type="button" className="primary-button" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
            {cancel.isPending ? vi.api.loading : copy.cancelConfirm}
          </button>
        )}
      </div>
    </div>
  );
}
