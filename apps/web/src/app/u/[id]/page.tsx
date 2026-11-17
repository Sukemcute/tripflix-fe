import { PublicProfile } from '@/features/social/public-profile';

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicProfile key={id} userId={id} />;
}
