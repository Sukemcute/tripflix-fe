import { redirect } from 'next/navigation';
import { LiveLogin } from '@/features/auth/live-account';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : undefined;
  // Link cũ /login?mode=register (trước khi tách trang) vẫn mở đúng trang đăng ký.
  if (params.mode === 'register') {
    redirect(returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : '/register');
  }
  return <LiveLogin returnTo={returnTo} />;
}
