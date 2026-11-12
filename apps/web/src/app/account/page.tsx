import { readAccountTab } from '@/features/auth/account-tabs';
import { LiveAccount } from '@/features/auth/live-account';

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const tab = readAccountTab((await searchParams).tab);
  // key theo tab: đang ở /account mà bấm "Bài đăng của tôi" trên menu thì mở lại đúng tab.
  return <LiveAccount key={tab} initialTab={tab} />;
}
