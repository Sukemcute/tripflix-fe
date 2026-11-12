import type { Metadata } from 'next';
import { vi } from '@tripflix/i18n';
import { CheckoutScreen } from '@/features/checkout/checkout-screen';

export const metadata: Metadata = { title: `${vi.commerce.checkout} | Tripflix` };

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CheckoutScreen key={id} id={id} />;
}
