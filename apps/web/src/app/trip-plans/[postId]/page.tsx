import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { buildTripPlanFallbackMetadata, buildTripPlanMetadata } from '@/features/seo/page-metadata';
import { findPublicPost, findPublicPostDetail } from '@/features/seo/public-data';
import { createTripPlanHydrationState } from '@/features/seo/trip-plan-hydration';
import { TripPlanView } from '@/features/social/trip-plan/trip-plan-view';

/** Tiêu đề, mô tả và ảnh bìa theo bài lộ trình (TF112). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  const post = await findPublicPost(postId);
  return post ? buildTripPlanMetadata(post) : buildTripPlanFallbackMetadata(postId);
}

/** Chi tiết chuyến đi của một bài (TF25): mở từ nút "Xem chi tiết chuyến đi" ở sidebar Cảm hứng. */
/** Dữ liệu ẩn danh đưa vào cache trước để HTML đầu tiên có tiêu đề, lịch trình và ảnh bìa (TF113). */
export default async function TripPlanPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const detail = await findPublicPostDetail(postId);
  return (
    <HydrationBoundary state={createTripPlanHydrationState(postId, detail)}>
      <TripPlanView key={postId} postId={postId} />
    </HydrationBoundary>
  );
}
