import HomeScreen from '@/features/discovery/home-screen';

export default async function InspirationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q } = await searchParams;
  return <HomeScreen query={typeof q === 'string' ? q.trim().slice(0, 100) : ''} />;
}
