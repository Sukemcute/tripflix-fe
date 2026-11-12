const paths: Record<string, string> = {
  location: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM9 10a3 3 0 1 0 6 0 3 3 0 0 0-6 0',
  mountain: 'm2 21 8-17 4 8 3-5 5 14H2Zm5-10 3 2 3-2',
  view: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm7 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0',
  quiet: 'M12 3a9 9 0 1 0 9 9A7 7 0 0 1 12 3Z',
  culture: 'm3 8 9-5 9 5H3Zm2 3v7m5-7v7m4-7v7m5-7v7M3 21h18',
  business: 'M3 7h18v14H3ZM8 7V3h8v4M3 12q9 5 18 0m-9 1v4',
  accessible: 'M12 3h.01M10 7v8h8l3 5M10 10h7M7 10a6 6 0 1 0 8 9',
  bike: 'M3 17a4 4 0 1 0 8 0 4 4 0 0 0-8 0Zm12 0a4 4 0 1 0 8 0 4 4 0 0 0-8 0ZM7 17l4-10 8 10M9 7h5m1-4h3l1 4',
  elevator: 'M3 2h18v20H3ZM12 7v10m-3-7 3-3 3 3m-6 4 3 3 3-3',
  currency: 'M12 2v20m5-16h-7a4 4 0 0 0 0 8h4a4 4 0 0 1 0 8H6',
  kitchen: 'M3 8h18v13H3ZM7 3v2m5-2v2m5-2v2M3 12h18M8 16h8v5',
  tennis: 'M15 3c7 0 8 7 3 11s-11-1-9-6q2-5 6-5ZM9 14 2 22m8-18 9 8m-6-9 8 6',
  crib: 'M3 10h18v9H3ZM3 6v16m18-16v16M7 10v9m5-9v9m5-9v9',
  'ev-charger': 'M4 3h11v18H4Zm3 5h5m6-2 3 3v9q-3 3-3-2v-4h-3M10 11l-3 4h4l-3 4',
  extinguisher: 'M9 8h7v13H9ZM11 8V5h4v3m-3-3V2h5m-6 3H6v10',
  'fire-alarm': 'M4 5h16v16H4ZM8 13a4 4 0 1 0 8 0 4 4 0 0 0-8 0M12 2v1m-8-2 2 2m14-2-2 2',
  pool: 'M3 17q3-3 6 0t6 0t6 0M3 21q3-3 6 0t6 0t6 0M7 13V5a2 2 0 0 1 4 0m3 8V5a2 2 0 0 1 4 0M7 8h7',
  spa: 'M12 21C2 19 2 11 3 8q6 0 9 7 3-7 9-7c1 3 1 11-9 13ZM12 15Q6 8 12 2q6 6 0 13',
  wifi: 'M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0M12 20h.01',
  restaurant: 'M5 3v7m3-7v7m-6-7v7q3 4 6 0m-3 3v8M18 21V3q-6 4-3 10h3',
  gym: 'M6 3v18M3 6v12m15-15v18m3-15v12M6 12h12',
  parking: 'M5 3h14v18H5ZM10 17V7h3a3 3 0 0 1 0 6h-3',
  beach: 'M3 11q9-16 18 0H3Zm9 0v10m-4 0h8',
  bar: 'm4 3 8 9 8-9H4Zm8 9v9m-4 0h8',
  kids: 'M12 3v3m-6 3a7 7 0 1 0 12 0M8 12h.01M16 12h.01M9 16q3 3 6 0',
  airport: 'm3 13 8-2V3l2-1 1 9 7 2v2l-7-1v6l3 1v1H7v-1l4-1v-6l-8 1Z',
  reception: 'M3 18h18M5 15a7 7 0 0 1 14 0H5ZM12 8V5m-2 0h4',
  laundry: 'M4 3h16v18H4ZM4 7h16M8 5h.01m3 0h.01M8 14a4 4 0 1 0 8 0 4 4 0 0 0-8 0',
  check: 'm5 12 4 4L19 6',
};
const aliases: Record<string, string> = {
  food: 'restaurant',
  family: 'kids',
  work: 'business',
  massage: 'spa',
  sauna: 'spa',
  'high-chair': 'crib',
  swimming_pool: 'pool',
  fitness: 'gym',
  fitness_center: 'gym',
  dining: 'restaurant',
  breakfast: 'restaurant',
  cafe: 'bar',
  coffee: 'bar',
  playground: 'kids',
  kids_club: 'kids',
  airport_shuttle: 'airport',
  shuttle: 'airport',
  front_desk: 'reception',
  concierge: 'reception',
  '24h': 'reception',
  parking_lot: 'parking',
};
export function HotelIcon({ name }: { name: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[aliases[name] ?? name] ?? paths.check} />
    </svg>
  );
}
