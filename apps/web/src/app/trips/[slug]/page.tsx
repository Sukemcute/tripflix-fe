import { LivePostDetail } from '@/features/social/live-posts';
export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LivePostDetail id={slug} />;
}
