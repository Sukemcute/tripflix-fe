import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const featuresRoot = resolve(here, '..');

function readFeature(relPath: string): string {
  return readFileSync(resolve(featuresRoot, relPath), 'utf8');
}

describe('segmented-tabs shared CSS & wave 1 migration', () => {
  it('defines all shared variants, active states, focus ring, reduced-motion, and design tokens without hex colors', () => {
    const css = readFeature('shared/segmented-tabs.module.css');

    expect(css).toContain('.tabs {');
    expect(css).toContain('.tabsGlass {');
    expect(css).toContain('.tabsDark {');
    expect(css).toContain('.tabsDarkAnchor {');
    expect(css).toContain('.tabsAuto {');
    expect(css).toContain('.tab {');
    expect(css).toContain('.tabCompact {');
    expect(css).toContain('.tabActive');
    expect(css).toContain("[aria-selected='true']");
    expect(css).toContain("[aria-pressed='true']");
    expect(css).toContain('.tab:focus-visible');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('var(--color-ink)');
    expect(css).toContain('var(--color-background)');
    expect(css).toContain('var(--color-surface-muted)');
    expect(css).toContain('var(--water-glass');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('migrates wave 1 social tabs to segmented-tabs.module.css without inline tab active colors', () => {
    const socialFeedView = readFeature('social/feed/social-feed-view.tsx');
    const itineraryPanel = readFeature('social/feed/itinerary-sidebar-panel.tsx');
    const publicProfile = readFeature('social/public-profile.tsx');
    const searchResultsGrid = readFeature('social/search-results-grid.tsx');
    const moderationStatus = readFeature('social/moderation-status.tsx');
    const livePosts = readFeature('social/live-posts.tsx');

    for (const source of [
      socialFeedView,
      itineraryPanel,
      publicProfile,
      searchResultsGrid,
      moderationStatus,
      livePosts,
    ]) {
      expect(source).toContain('segmented-tabs.module.css');
    }

    expect(socialFeedView).toContain('segmentedTabs.tabsGlass');
    expect(socialFeedView).not.toContain('tf-color-ink');
    expect(itineraryPanel).toContain('segmentedTabs.tabCompact');
    expect(publicProfile).toContain('segmentedTabs.tabsAuto');
    expect(searchResultsGrid).toContain('segmentedTabs.tabsAuto');
    expect(moderationStatus).toContain('segmentedTabs.tabsAuto');
    expect(livePosts).toContain('segmentedTabs.tabsDarkAnchor');
    expect(livePosts).toContain('segmentedTabs.tabsDark');
    expect(livePosts).not.toContain("selected ? '#ffffff' : 'transparent'");
  });

  it('keeps trip-plan-view actions untouched because it is a bookmark/share bar rather than segmented tabs', () => {
    const tripPlanView = readFeature('social/trip-plan/trip-plan-view.tsx');
    expect(tripPlanView).toContain('styles.actionButton');
    expect(tripPlanView).not.toContain('role="tablist"');
  });

  it('migrates wave 2 flight trip switcher and home destination switcher while preserving filter chips & 2-line cards', () => {
    const flightSearchForm = readFeature('flights/flight-search-form.tsx');
    const otaHomePreviews = readFeature('discovery/ota-home-previews.tsx');
    const hotelReviews = readFeature('hotels/hotel-reviews.tsx');
    const stayFilters = readFeature('discovery/stay-result-filters.tsx');
    const liveSearch = readFeature('discovery/live-search-screen.tsx');
    const flightResults = readFeature('flights/flight-results.tsx');

    expect(flightSearchForm).toContain('segmented-tabs.module.css');
    expect(flightSearchForm).toContain('segmentedTabs.tabCompact');
    expect(otaHomePreviews).toContain('segmented-tabs.module.css');
    expect(otaHomePreviews).toContain('segmentedTabs.tabsAuto');

    expect(hotelReviews).not.toContain('segmented-tabs.module.css');
    expect(stayFilters).not.toContain('segmented-tabs.module.css');
    expect(liveSearch).not.toContain('segmented-tabs.module.css');
    expect(flightResults).not.toContain('segmented-tabs.module.css');
  });

  it('uses solid var(--color-background) at single source for itinerarySidebar and rightPanel across Feed & Reels', () => {
    const socialFeedCss = readFeature('social/feed/social-feed.module.css');
    const livePostsCss = readFeature('social/live-posts.module.css');
    const otaMotionCss = readFeature('discovery/ota-home-motion.module.css');

    expect(socialFeedCss).toMatch(/\.itinerarySidebar\s*\{[^}]*background:\s*var\(--color-background\);/);
    expect(livePostsCss).toMatch(/\.rightPanel\s*\{[^}]*background:\s*var\(--color-background\);/);
    expect(otaMotionCss).not.toContain('itineraryInFeed');
    expect(otaMotionCss).not.toContain('rightPanelInFeed');
  });
});
