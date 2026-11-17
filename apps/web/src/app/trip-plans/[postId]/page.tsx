import type { Metadata } from 'next';
import { vi } from '@tripflix/i18n';
import { TripPlanView } from '@/features/social/trip-plan/trip-plan-view';

export const metadata: Metadata = { title: `${vi.api.tripPlanPageTitle} | Tripflix` };

/** Chi tiết chuyến đi của một bài (TF25): mở từ nút "Xem chi tiết chuyến đi" ở sidebar Cảm hứng. */
export default async function TripPlanPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  return <TripPlanView key={postId} postId={postId} />;
}
