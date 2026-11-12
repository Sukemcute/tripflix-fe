import { Suspense } from 'react';
import { vi } from '@tripflix/i18n';
import { LiveSearchScreen } from '@/features/discovery/live-search-screen';
import { OtaHero } from '@/features/discovery/ota-hero';
import { OtaHomeMotion } from '@/features/discovery/ota-home-motion';
import { OtaHomeSections } from '@/features/discovery/ota-home-sections';
import searchStyles from '@/features/discovery/stay-search.module.css';

export default function HomePage() {
  return (
    <OtaHomeMotion>
      <OtaHero />
      {/* URL-dependent form suspends independently; the hero stays in initial HTML. */}
      <Suspense
        fallback={
          <section
            id="ota-search"
            className="ota-container results-page ota-home"
            aria-busy="true"
            aria-label={vi.api.findStays}
          >
            <div className={`${searchStyles.homepagePanel} ${searchStyles.homepagePlaceholder} skeleton`} />
          </section>
        }
      >
        <LiveSearchScreen isHomepage />
      </Suspense>
      <OtaHomeSections />
    </OtaHomeMotion>
  );
}
