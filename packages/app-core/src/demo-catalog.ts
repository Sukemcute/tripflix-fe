export type DemoTripSlug = 'nha-trang' | 'hoi-an' | 'da-nang' | 'nha-trang-hotel';
export type DemoDestination = 'nha-trang' | 'hoi-an' | 'da-nang';
export type DemoCategory = 'all' | 'sea' | 'culture' | 'hotel';
export interface DemoTrip {
  slug: DemoTripSlug;
  destination: DemoDestination;
  image: 'sea' | 'hoiAn' | 'beach' | 'hotel';
  pricePerGuest: number;
  days: number;
  nights: number;
  category: Exclude<DemoCategory, 'all'>;
  likes: number;
  trendingRank: number;
}

/** Public fixtures for mentor review; these are neither live inventory nor AI results. */
export const DEMO_TRIPS: readonly DemoTrip[] = [
  {
    slug: 'nha-trang',
    destination: 'nha-trang',
    image: 'sea',
    pricePerGuest: 3_390_000,
    days: 3,
    nights: 2,
    category: 'sea',
    likes: 1248,
    trendingRank: 2,
  },
  {
    slug: 'hoi-an',
    destination: 'hoi-an',
    image: 'hoiAn',
    pricePerGuest: 2_490_000,
    days: 3,
    nights: 2,
    category: 'culture',
    likes: 2386,
    trendingRank: 1,
  },
  {
    slug: 'da-nang',
    destination: 'da-nang',
    image: 'beach',
    pricePerGuest: 2_790_000,
    days: 3,
    nights: 2,
    category: 'sea',
    likes: 986,
    trendingRank: 3,
  },
  {
    slug: 'nha-trang-hotel',
    destination: 'nha-trang',
    image: 'hotel',
    pricePerGuest: 1_490_000,
    days: 2,
    nights: 1,
    category: 'hotel',
    likes: 642,
    trendingRank: 4,
  },
];

export function getDemoTrip(slug: string): DemoTrip | undefined {
  return DEMO_TRIPS.find((trip) => trip.slug === slug);
}

export function normalizeDemoQuery(query: string): string {
  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export interface DemoSearchCriteria {
  destination: DemoDestination | null;
  budget: number | null;
  guests: number;
  hotelOnly: boolean;
  unsupportedDestination: boolean;
}

export function parseDemoSearch(query: string): DemoSearchCriteria {
  const text = normalizeDemoQuery(query);
  const destination = /nha trang/.test(text)
    ? 'nha-trang'
    : /hoi an/.test(text)
      ? 'hoi-an'
      : /da nang/.test(text)
        ? 'da-nang'
        : null;
  const amount = /(?:duoi|toi da|ngan sach|tam|khoang|<=?)\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr\b|k\b|nghin)/.exec(
    text,
  );
  const budget = amount
    ? Number(amount[1]!.replace(',', '.')) * (/^(k|nghin)$/.test(amount[2]!) ? 1_000 : 1_000_000)
    : null;
  const count = /(\d+)\s*(?:nguoi|khach)/.exec(text);
  return {
    destination,
    budget,
    guests: Math.min(8, Math.max(1, Number(count?.[1] ?? 2))),
    hotelOnly: /chi\s*(?:dat\s*)?(?:khach san|luu tru)|khong\s*(?:can\s*)?(?:ve|may bay)/.test(text),
    unsupportedDestination: /ha noi|da lat|phu quoc|sa pa|sapa|nhat ban|han quoc/.test(text),
  };
}

export function searchDemoTrips(
  query: string,
  options: { category?: DemoCategory; sort?: 'recommended' | 'price' } = {},
): { criteria: DemoSearchCriteria; trips: DemoTrip[] } {
  const criteria = parseDemoSearch(query);
  const trips = DEMO_TRIPS.filter(
    (trip) =>
      !criteria.unsupportedDestination &&
      (!criteria.destination || trip.destination === criteria.destination) &&
      (criteria.budget === null || trip.pricePerGuest <= criteria.budget) &&
      (!criteria.hotelOnly || trip.category === 'hotel') &&
      (!options.category || options.category === 'all' || trip.category === options.category),
  ).sort((a, b) =>
    options.sort === 'price' ? a.pricePerGuest - b.pricePerGuest : a.trendingRank - b.trendingRank,
  );
  return { criteria, trips };
}

export function getDemoFeed(mode: 'for-you' | 'trending'): DemoTrip[] {
  const trips = DEMO_TRIPS.filter((trip) => trip.category !== 'hotel');
  return mode === 'trending' ? [...trips].sort((a, b) => a.trendingRank - b.trendingRank) : trips;
}

export function getDemoAdminReturnPath(value: unknown): string {
  return typeof value === 'string' &&
    ['/', '/moderation', '/analytics', '/inventory', '/orders', '/staff'].includes(value)
    ? value
    : '/';
}
