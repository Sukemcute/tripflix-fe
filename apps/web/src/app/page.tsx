import { LiveSearchScreen } from '@/features/discovery/live-search-screen';
import { OtaHero } from '@/features/discovery/ota-hero';
import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';

const destinations = [
  ['nha-trang', 'sea.jpg'],
  ['hoi-an', 'hoian.jpg'],
  ['da-nang', 'home-shore.jpg'],
] as const;

export default function HomePage() {
  return (
    <>
      <OtaHero />
      <LiveSearchScreen isHomepage />
      <section className="ota-container ota-destinations">
        <p className="eyebrow">{vi.api.destination}</p>
        <h2>{vi.api.otaExplore}</h2>
        <div className="trip-grid">
          {destinations.map(([id, image]) => {
            const name = vi.api.otaDestinations[id];
            return (
              <Link href={{ pathname: '/search', query: { q: name } }} key={id}>
                <Image
                  src={`/brand/${image}`}
                  alt=""
                  width={620}
                  height={460}
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <strong>
                  {name} <span aria-hidden="true">↗</span>
                </strong>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
