import { LiveLogin } from '@/features/auth/live-account';
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <LiveLogin returnTo={typeof params.returnTo === 'string' ? params.returnTo : undefined} />;
}
