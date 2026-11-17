import { ModerationWorkspace } from '@/features/moderation/moderation-workspace';
import { vi } from '@tripflix/i18n';
import { Suspense } from 'react';

export const metadata = { title: `${vi.admin.moderation} | ${vi.admin.title}` };

export default function Page() {
  // useSearchParams cần Suspense để trang vẫn dựng tĩnh được.
  return (
    <Suspense>
      <ModerationWorkspace />
    </Suspense>
  );
}
