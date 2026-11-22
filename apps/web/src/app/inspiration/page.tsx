import { vi } from '@tripflix/i18n';
import HomeScreen from '@/features/discovery/home-screen';
import { validateInspirationKeyword } from '@/features/discovery/inspiration-keyword';

export default async function InspirationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q } = await searchParams;
  const result = q === undefined ? null : validateInspirationKeyword(q);
  return <HomeScreen queryError={result?.error ? vi.api[result.error] : undefined} />;
}
