import { DEMO_TRIPS, getDemoTrip } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChooseTrip } from '@/features/discovery/choose-trip';
import { formatPrice, TripCard, tripImages } from '@/features/discovery/trip-card';

export default async function TripDetailScreen({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = getDemoTrip(slug);
  if (!trip) notFound();
  const copy = vi.demo;
  const content = copy.trips[trip.slug];
  return (
    <main id="content" className="ota-container detail-page">
      <Link
        className="back-link"
        href={`/search?q=${encodeURIComponent(content.destination.split(',')[0]!)}`}
      >
        ← {copy.common.back}
      </Link>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{content.destination}</p>
          <h1>{content.title}</h1>
          <p className="muted">
            {trip.days} {copy.common.days} {trip.nights} {copy.common.nights} · {content.tags}
          </p>
        </div>
        <span className="demo-badge">{copy.common.badge}</span>
      </div>
      <div className="detail-gallery">
        <Image src={tripImages[trip.image]} alt={content.destination} width={1400} height={900} priority />
        <Image src="/brand/hotel.jpg" alt={content.stay} width={700} height={900} />
      </div>
      <div className="detail-columns">
        <div>
          <section className="detail-section">
            <p className="eyebrow">{copy.web.description}</p>
            <h2>{content.headline.replace('\n', ' ')}</h2>
            <p className="detail-summary">{content.summary}</p>
          </section>
          <section className="detail-section" id="itinerary">
            <p className="eyebrow">{copy.common.itinerary}</p>
            <h2>{copy.web.detailsTitle}</h2>
            <ol className="itinerary-list">
              {content.days.map((day, index) => (
                <li key={day}>
                  <span className="day-number">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>
                      {vi.mobile.itinerary.day} {index + 1}
                    </h3>
                    <p>{day}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section className="detail-section">
            <p className="eyebrow">{copy.web.hotelTitle}</p>
            <h2>{content.stay}</h2>
            <p>{content.stayBody}</p>
          </section>
        </div>
        <aside className="price-panel">
          <p className="eyebrow">{copy.common.reference}</p>
          <p className="detail-price">
            {formatPrice(trip.pricePerGuest)} <span>{copy.common.perGuest}</span>
          </p>
          <h3>{copy.web.priceTitle}</h3>
          <p>{copy.web.includes}</p>
          <ChooseTrip />
          <p className="small muted">{copy.web.priceDisclaimer}</p>
        </aside>
      </div>
      <section className="curated-section">
        <div className="section-heading">
          <h2>{copy.web.otherTrips}</h2>
        </div>
        <div className="trip-grid">
          {DEMO_TRIPS.filter((other) => other.slug !== trip.slug)
            .slice(0, 3)
            .map((other) => (
              <TripCard key={other.slug} trip={other} />
            ))}
        </div>
      </section>
    </main>
  );
}
