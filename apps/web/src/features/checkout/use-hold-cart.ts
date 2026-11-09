'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createCheckoutOperation } from '@tripflix/api-client';
import { createBookingCartRequest, EMPTY_BOOKING_CART, type BookingCart } from '@tripflix/app-core';
import { useRouter } from 'next/navigation';

/** Giữ chỗ các phòng được truyền vào, xoá chúng khỏi nơi lưu rồi sang thanh toán. */
export function useHoldCart(cart: BookingCart, saveCart: (cart: BookingCart) => void) {
  const router = useRouter();
  // Giữ một operation để bấm lại sau lỗi mạng gửi đúng Idempotency-Key cũ.
  const [createCheckout] = useState(createCheckoutOperation);
  return useMutation({
    retry: false,
    mutationFn: () => createCheckout(createBookingCartRequest(cart)),
    onSuccess: (order) => {
      saveCart(EMPTY_BOOKING_CART);
      router.push(`/checkout/${encodeURIComponent(order.orderId)}`);
    },
  });
}
