import type { Metadata } from 'next';
import { buildTripPlanFallbackMetadata, buildTripPlanMetadata } from '@/features/seo/page-metadata';
import { findPublicPost } from '@/features/seo/public-data';
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
export default async function TripPlanPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  return <TripPlanView key={postId} postId={postId} />;
}
