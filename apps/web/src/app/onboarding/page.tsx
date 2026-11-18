import type { Metadata } from 'next';
import { vi } from '@tripflix/i18n';
import { OnboardingFlow } from '@/features/onboarding/onboarding-flow';

export const metadata: Metadata = { title: vi.api.onboardingWelcomeTitle };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <OnboardingFlow
      returnTo={typeof params.returnTo === 'string' ? params.returnTo : undefined}
      mode={typeof params.mode === 'string' ? params.mode : undefined}
    />
  );
}
