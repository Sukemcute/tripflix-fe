import { LiveSearchScreen } from '@/features/discovery/live-search-screen';
import { OtaHero } from '@/features/discovery/ota-hero';
import { OtaHomeMotion } from '@/features/discovery/ota-home-motion';
import { OtaHomeSections } from '@/features/discovery/ota-home-sections';

export default function HomePage() {
  return (
    <OtaHomeMotion>
      <OtaHero />
      <LiveSearchScreen isHomepage />
      <OtaHomeSections />
    </OtaHomeMotion>
  );
}
