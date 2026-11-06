import { useId } from 'react';

// Sao "3D mềm": gradient vàng → cam, viền bo tròn, vệt sáng phía trên và bóng đổ (CSS).
export function SoftStarIcon({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="var(--color-sun-soft)" />
          <stop offset="0.45" stopColor="var(--color-sun)" />
          <stop offset="1" stopColor="var(--color-coral-soft)" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="0.38" cy="0.3" r="0.45">
          <stop offset="0" stopColor="var(--color-background)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--color-background)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="m12 3.6 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8Z"
        fill={`url(#${id}-fill)`}
        stroke={`url(#${id}-fill)`}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <ellipse cx="10.6" cy="9.6" rx="3.6" ry="2.4" fill={`url(#${id}-shine)`} />
    </svg>
  );
}
