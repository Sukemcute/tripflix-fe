import type { Metadata } from 'next';
import { buildProfileFallbackMetadata, buildProfileMetadata } from '@/features/seo/page-metadata';
import { findPublicProfile } from '@/features/seo/public-data';
import { PublicProfile } from '@/features/social/public-profile';

/** Tên hiển thị và số người theo dõi trong tiêu đề, mô tả hồ sơ (TF112). */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const profile = await findPublicProfile(id);
  return profile ? buildProfileMetadata(profile) : buildProfileFallbackMetadata(id);
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicProfile key={id} userId={id} />;
}
