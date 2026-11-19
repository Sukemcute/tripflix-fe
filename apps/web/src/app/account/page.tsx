import { readAccountTab } from '@/features/auth/account-tabs';
import { LiveAccount } from '@/features/auth/live-account';

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const tab = readAccountTab((await searchParams).tab);
  // Remount khi điều hướng sang tab tài khoản khác.
  return <LiveAccount key={tab} initialTab={tab} />;
}
