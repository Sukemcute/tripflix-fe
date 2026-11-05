import { LiveSearchScreen } from '@/features/discovery/live-search-screen';
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <LiveSearchScreen initialQuery={typeof params.q === 'string' ? params.q.slice(0, 100) : ''} />;
}
