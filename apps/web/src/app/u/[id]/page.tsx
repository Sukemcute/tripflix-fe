import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { createProfileHydrationState } from '@/features/seo/profile-hydration';
import { buildProfileFallbackMetadata, buildProfileMetadata } from '@/features/seo/page-metadata';
import { findPublicAuthorVlogs, findPublicProfile, hasPublicProfilePosts } from '@/features/seo/public-data';
import { PublicProfile } from '@/features/social/public-profile';

/** Tên hiển thị và số người theo dõi trong tiêu đề, mô tả hồ sơ (TF112); noindex nếu chưa có bài công khai (TF25). */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [profile, hasPublicPosts] = await Promise.all([findPublicProfile(id), hasPublicProfilePosts(id)]);
  return profile ? buildProfileMetadata(profile, { hasPublicPosts }) : buildProfileFallbackMetadata(id);
}

/** Dữ liệu ẩn danh đưa vào cache trước để HTML đầu tiên có tên, số liệu và bài (TF113). */
export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, vlogs] = await Promise.all([findPublicProfile(id), findPublicAuthorVlogs(id)]);
  return (
    <HydrationBoundary state={createProfileHydrationState(id, profile, vlogs)}>
      <PublicProfile key={id} userId={id} />
    </HydrationBoundary>
  );
}
