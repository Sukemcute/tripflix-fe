import type { SVGProps } from 'react';

/** Bộ icon nét 1.75px vẽ tay, cùng lưới 24px; không kéo thêm thư viện icon. */
const PATHS = {
  overview: 'M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-4H4v4Zm10-13h6V4h-6v3Z',
  shield: 'M12 3 5 6v5c0 4.4 3 8.2 7 9.5 4-1.3 7-5.1 7-9.5V6l-7-3Zm-3 9 2 2 4-4',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0',
  audit: 'M8 4h8l3 3v13H5V4h3Zm0 6h8M8 14h8M8 18h5',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm5-2 4 4',
  jobs: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  spark: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6',
  calendar: 'M5 6h14v14H5V6Zm0 4h14M9 3v4m6-4v4',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h4',
  trend: 'm3 17 6-6 4 4 8-8m0 0h-5m5 0v5',
  report: 'M5 20V10m5 10V4m5 16v-8m5 8V7',
  users: 'M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20m16 0v-1.5a3.5 3.5 0 0 0-2.5-3.35M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-7.6a4 4 0 0 1 0 7.2',
  refresh: 'M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4m-4 5a8 8 0 0 0 14.6 4.5M20 20v-4h-4',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4m-4-4h11',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6 6 18',
  chevronRight: 'm9 6 6 6-6 6',
  alert: 'M12 4 2.8 20h18.4L12 4Zm0 6v4m0 3v.01',
  check: 'm5 12 4.5 4.5L19 7',
  inbox: 'M4 13V6h16v7m-16 0v5h16v-5m-16 0h4l1.5 2.5h5L16 13h4',
  external: 'M14 4h6v6m0-6-9 9M18 14v6H4V6h6',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  pulse: 'M3 12h4l2-5 4 10 2-5h6',
  comment: 'M5 5h14v10H9l-4 4V5Z',
  image: 'M4 5h16v14H4V5Zm4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 4-5-5-9 9',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
