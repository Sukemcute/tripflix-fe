import { ResetPassword } from '@/features/auth/reset-password';

// Đường dẫn cố định theo AUTH_PASSWORD_RESET_URL của core-api: link trong email là /dat-lai-mat-khau?token=...
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await searchParams;
  return <ResetPassword token={typeof token === 'string' && token ? token : undefined} />;
}
