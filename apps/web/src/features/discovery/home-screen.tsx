import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { SearchForm } from '@/features/discovery/search-form';
import { PublicPosts } from '@/features/social/live-posts';

export default function HomeScreen() {
  const copy = vi.demo;
  return (
    <main id="content" className="ota-container">
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">{copy.web.eyebrow}</span>
          <h1>{copy.web.title}</h1>
          <p className="hero-body">{copy.web.body}</p>
          <div className="tripi-line">
            <Image src="/brand/tripi-curious.png" alt={vi.mobile.common.mascot} width={64} height={64} />
            <span>{copy.web.howTitle}</span>
          </div>
        </div>
        <div className="hero-photo">
          <Image
            src="/brand/sea.jpg"
            alt={copy.trips['nha-trang'].destination}
            width={1200}
            height={900}
            priority
          />
          <div className="hero-caption">
            <span>{copy.trips['nha-trang'].tags}</span>
            <strong>{copy.trips['nha-trang'].title}</strong>
            <Link href="/search?q=Nha%20Trang">
              {copy.common.detail} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>
      <div className="home-search">
        <SearchForm />
        <nav className="suggested-queries" aria-label={copy.web.suggestions}>
          <span>{vi.api.suggestionsLabel}</span>
          {[
            copy.trips['nha-trang'].destination,
            copy.trips['hoi-an'].destination,
            copy.trips['da-nang'].destination,
          ].map((query) => (
            <Link key={query} href={`/search?q=${encodeURIComponent(query)}`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14">
                <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
                <circle cx="12" cy="10" r="2.4" />
              </svg>
              {query}
            </Link>
          ))}
        </nav>
      </div>
      <section className="curated-section" id="trips">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.common.trending}</p>
            <h2>{copy.web.curatedTitle}</h2>
          </div>
          <p className="muted">{copy.web.curatedBody}</p>
        </div>
        <PublicPosts />
      </section>
      <section className="how-section" id="how">
        <Image src="/brand/tripi-welcome.png" alt={vi.mobile.common.mascot} width={120} height={120} />
        <div>
          <h2>{copy.web.howTitle}</h2>
          <p>{vi.api.choosePlace}</p>
        </div>
      </section>
    </main>
  );
}
