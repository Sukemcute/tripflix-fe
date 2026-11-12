import { LiveRegister } from '@/features/auth/register-form';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <LiveRegister returnTo={typeof params.returnTo === 'string' ? params.returnTo : undefined} />;
}
