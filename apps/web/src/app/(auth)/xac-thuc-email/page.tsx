import type { Metadata } from 'next';
import { VerifyEmail } from '@/features/auth/verify-email';

export const metadata: Metadata = { referrer: 'no-referrer' };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return typeof token === 'string' ? <VerifyEmail token={token} /> : <VerifyEmail />;
}
