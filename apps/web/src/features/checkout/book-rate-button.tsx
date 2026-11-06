'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createCheckoutOperation, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckoutError } from './checkout-error';

const copy = vi.commerce;

export interface BookRateInput {
  productId: string;
  ratePlanCode: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  roomCount: number;
}

/** Giữ chỗ gói giá đã chọn rồi chuyển sang trang thanh toán; chưa đăng nhập thì đăng nhập trước. */
export function BookRateButton({ booking, isDisabled }: { booking: BookRateInput; isDisabled?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isReady } = useApiSession();
  // Một operation cho mỗi nút để bấm lại (mất mạng) gửi đúng Idempotency-Key cũ.
  const [createCheckout] = useState(createCheckoutOperation);
  const mutation = useMutation({
    retry: false,
    mutationFn: () =>
      createCheckout({
        adults: booking.adults,
        items: [
          {
            productId: booking.productId,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            qty: booking.roomCount,
            ratePlanCode: booking.ratePlanCode,
          },
        ],
      }),
    onSuccess: (order) => router.push(`/checkout/${encodeURIComponent(order.orderId)}`),
  });

  if (isReady && !user) {
    const returnTo = `${pathname}?${searchParams.toString()}`;
    return (
      <a className="secondary-button" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
        {copy.login}
      </a>
    );
  }
  return (
    <>
      <button
        type="button"
        className="primary-button"
        disabled={isDisabled || !isReady || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? vi.api.loading : copy.choose}
      </button>
      <CheckoutError error={mutation.error} />
    </>
  );
}
