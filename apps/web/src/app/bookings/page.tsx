import type { Metadata } from 'next';
import { vi } from '@tripflix/i18n';
import { BookingsScreen } from '@/features/checkout/bookings-screen';

export const metadata: Metadata = { title: `${vi.commerce.booked} | Tripflix` };

export default function BookingsPage() {
  return <BookingsScreen />;
}
