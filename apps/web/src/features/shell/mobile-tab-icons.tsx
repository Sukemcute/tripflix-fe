import type { ReactNode } from 'react';

// Icon nét mảnh 22px của thanh đáy, cùng kiểu icon menu header (ota-navigation.tsx), vẽ bằng currentColor.
const PATHS = {
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  booking: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5V10a2 2 0 0 0 0 4v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5V14a2 2 0 0 0 0-4z" />
      <path d="M14 7v10" strokeDasharray="1.5 2" />
    </>
  ),
  create: <path d="M12 6v12M6 12h12" />,
  inspiration: <path d="M12 3.5 13.8 9l5.7.3-4.4 3.6 1.5 5.6L12 15.4l-4.6 3.1 1.5-5.6-4.4-3.6L10.2 9z" />,
  me: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </>
  ),
  hotel: (
    <>
      <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 15h18M3 18v2M21 18v2" />
      <path d="M7 12h3" />
    </>
  ),
  flight: (
    <path d="m3 14 7-2 4-7.5a1.2 1.2 0 0 1 2 .6L15 12l5 1.5a1 1 0 0 1 .3 1.8l-2.3 1.2-6-1-3.5 4H7l1.5-4L4 15z" />
  ),
  cart: (
    <>
      <path d="M3 4h2l2.4 11h10.8L21 8H6" />
      <circle cx="9.5" cy="19.5" r="1.4" />
      <circle cx="17" cy="19.5" r="1.4" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type MobileTabIconName = keyof typeof PATHS;

export function MobileTabIcon({ name, size = 22 }: { name: MobileTabIconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}
