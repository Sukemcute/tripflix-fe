import { redirect } from 'next/navigation';
import { buildPostHref } from '@/features/social/search-url';

/** Trang chi tiết bài cũ đã bỏ: link cũ (thông báo, link đã gửi) chuyển sang bài đó ở trang Cảm hứng. */
export default async function LegacyPostPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comment?: string | string[] }>;
}) {
  const [{ slug }, { comment }] = await Promise.all([params, searchParams]);
  redirect(buildPostHref(slug, { commentId: typeof comment === 'string' ? comment : undefined }));
}
