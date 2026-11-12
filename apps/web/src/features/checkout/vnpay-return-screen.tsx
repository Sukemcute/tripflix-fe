'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { commerceApi, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckoutError } from './checkout-error';
import styles from './checkout.module.css';

const copy = vi.commerce;

/** VNPay chuyển trình duyệt về đây; xác nhận chữ ký với backend rồi mở lại đơn để xem trạng thái thật. */
export function VnpayReturnScreen({ queryString }: { queryString: string }) {
  const router = useRouter();
  const { isReady } = useApiSession();
  const query = useQuery({
    queryKey: ['commerce', 'vnpay-return', queryString],
    enabled: isReady && !!queryString,
    retry: false,
    queryFn: () => commerceApi.confirmVnpay(queryString),
  });
  const orderId = query.data?.orderId;
  useEffect(() => {
    if (orderId) router.replace(`/checkout/${encodeURIComponent(orderId)}`);
  }, [orderId, router]);

  return (
    <main className={`ota-container ${styles.page}`}>
      <div className={styles.card}>
        <h1 className={styles.cardTitle}>{copy.vnpay}</h1>
        {!queryString && <p className={styles.error}>{copy.missingPaymentReturn}</p>}
        {!!queryString && !query.error && query.data?.orderId !== null && <p>{copy.verifyingPayment}</p>}
        {query.data && !query.data.orderId && <p className={styles.error}>{copy.vnpayFailed}</p>}
        <CheckoutError error={query.error} retry={() => void query.refetch()} />
        <Link prefetch={false} className="secondary-button" href="/bookings">
          {copy.viewTrips}
        </Link>
      </div>
    </main>
  );
}
