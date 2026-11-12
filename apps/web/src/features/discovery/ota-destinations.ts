import { vi } from '@tripflix/i18n';

export const OTA_DESTINATIONS = [
  { id: 'nha-trang', image: '/brand/sea.jpg', ...vi.ota.destinations['nha-trang'] },
  { id: 'hoi-an', image: '/brand/home-hoi-an-lanterns.jpg', ...vi.ota.destinations['hoi-an'] },
  { id: 'da-nang', image: '/brand/sea.jpg', ...vi.ota.destinations['da-nang'] },
] as const;

export function getDestinationHref(destination: (typeof OTA_DESTINATIONS)[number]) {
  return `/search?${new URLSearchParams({ placeId: destination.id, q: destination.name })}`;
}
