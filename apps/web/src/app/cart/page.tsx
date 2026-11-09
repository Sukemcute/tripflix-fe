import type { Metadata } from 'next';
import { vi } from '@tripflix/i18n';
import { CartScreen } from '@/features/checkout/cart-screen';

export const metadata: Metadata = { title: `${vi.commerce.cartTitle} | Tripflix` };

export default function CartPage() {
  return <CartScreen />;
}
