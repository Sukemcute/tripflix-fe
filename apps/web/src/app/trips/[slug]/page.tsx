import { LivePostDetail } from '@/features/social/live-posts';
export default async function PostPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comment?: string | string[] }>;
}) {
  const [{ slug }, { comment }] = await Promise.all([params, searchParams]);
  return <LivePostDetail id={slug} focusCommentId={typeof comment === 'string' ? comment : undefined} />;
}
