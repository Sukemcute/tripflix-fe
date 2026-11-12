import type { Metadata } from 'next';
import { vi } from '@tripflix/i18n';
import { VnpayReturnScreen } from '@/features/checkout/vnpay-return-screen';

export const metadata: Metadata = { title: `${vi.commerce.vnpay} | Tripflix` };

export default async function VnpayReturnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Chỉ chuyển tiếp tham số vnp_* cho backend kiểm chữ ký.
  const queryString = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      key.startsWith('vnp_') && value !== undefined
        ? (Array.isArray(value) ? value : [value]).map((entry): [string, string] => [key, entry])
        : [],
    ),
  ).toString();
  return <VnpayReturnScreen queryString={queryString} />;
}
