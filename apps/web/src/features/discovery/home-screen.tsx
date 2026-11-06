import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { ExploreResults } from '@/features/discovery/explore-results';
import { SearchForm } from '@/features/discovery/search-form';
import { StaySearchIcon } from '@/features/discovery/stay-search-icon';
import { PublicPosts } from '@/features/social/live-posts';

/** Trang Cảm hứng. Có ?q= thì phần danh sách bài thành kết quả tìm bài viết theo từ khoá. */
export default function HomeScreen({ query = '' }: { query?: string }) {
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
        {/* key theo từ khoá: bấm thẻ gợi ý hoặc "Xóa tìm kiếm" trên cùng trang thì ô nhập cập nhật theo. */}
        <SearchForm
          key={query}
          query={query}
          footer={
            <nav className="suggested-queries is-chips" aria-label={copy.web.suggestions}>
              <span>{vi.api.suggestionsLabel}</span>
              {/* Tên ngắn: tìm theo từ khoá trong bài, "Nha Trang, Khánh Hòa" sẽ không khớp bài nào. */}
              {Object.values(vi.api.otaDestinations).map((place) => (
                <Link key={place} href={`/inspiration?q=${encodeURIComponent(place)}#trips`}>
                  <StaySearchIcon name="place" />
                  {place}
                </Link>
              ))}
            </nav>
          }
        />
      </div>
      <section className="curated-section" id="trips">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{query ? vi.api.search : copy.common.trending}</p>
            <h2>{query ? t('api.searchResultsFor', { query }) : copy.web.curatedTitle}</h2>
          </div>
          {query ? (
            <Link className="secondary-button" href="/inspiration#trips">
              {vi.api.clearSearch}
            </Link>
          ) : (
            <p className="muted">{copy.web.curatedBody}</p>
          )}
        </div>
        {/* Có câu tìm: đi qua discovery (hiểu không dấu, viết tắt, ngân sách); không có: bài nổi bật như cũ. */}
        {query ? <ExploreResults query={query} /> : <PublicPosts />}
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
