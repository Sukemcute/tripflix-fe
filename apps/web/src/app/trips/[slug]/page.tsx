import { DEMO_TRIPS } from '@tripflix/app-core';

export { default } from '@/features/discovery/trip-detail-screen';

// The UI preview has a finite catalog. Unknown URLs must return a real 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return DEMO_TRIPS.map((trip) => ({ slug: trip.slug }));
}
