import { getDemoAdminReturnPath } from '@tripflix/app-core';
import { AdminLogin } from './live-login';

export default async function LiveLoginScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <AdminLogin returnTo={getDemoAdminReturnPath(params.returnTo)} />;
}
