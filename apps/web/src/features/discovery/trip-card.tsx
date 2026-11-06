import type { DemoTrip } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';

export const tripImages = {
  sea: '/brand/sea.jpg',
  hoiAn: '/brand/hoian.jpg',
  beach: '/brand/beach.jpg',
  hotel: '/brand/hotel.jpg',
} as const;
export function formatPrice(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} VNĐ`;
}

export function TripCard({ trip }: { trip: DemoTrip }) {
  const copy = vi.demo;
  const content = copy.trips[trip.slug];
  return (
    <article className="trip-card">
      <Link
        href={`/trips/${trip.slug}`}
        className="trip-card-link"
        aria-label={`${copy.common.detail}: ${content.title}`}
      >
        <div className="trip-card-photo">
          <Image src={tripImages[trip.image]} alt={content.destination} width={800} height={600} />
          <span className="photo-tag">{content.tags}</span>
        </div>
        <p className="muted small">
          {content.destination} · {trip.days} {copy.common.days} {trip.nights} {copy.common.nights}
        </p>
        <h3>{content.title}</h3>
        <p className="trip-card-summary">{content.summary}</p>
        <div className="trip-card-bottom">
          <strong>{formatPrice(trip.pricePerGuest)}</strong>
          <span className="muted small">{copy.common.perGuest}</span>
          <span className="card-arrow" aria-hidden="true">
            ↗
          </span>
        </div>
      </Link>
    </article>
  );
}
