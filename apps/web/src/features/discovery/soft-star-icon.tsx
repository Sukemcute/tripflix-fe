import { useId } from 'react';

const STAR_PATH =
  'M12 3 15.53 7.75 21.13 9.63 17.71 14.45 17.64 20.37 12 18.6 6.36 20.37 6.29 14.45 2.87 9.63 8.47 7.75Z';

// Sao kiểu hoạt hình bóng: viền nâu, vành cam, thân vàng và hai vệt sáng; đầu nhọn bo tròn bằng nét viền.
export function SoftStarIcon({ className }: { className?: string }) {
  const id = useId();
  const outline = { stroke: 'color-mix(in srgb, var(--color-coral-ink) 45%, var(--color-ink))' };
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-sun)" />
          <stop offset="1" stopColor="var(--color-coral-soft)" />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="0.2" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="var(--color-sun-soft)" />
          <stop offset="0.55" stopColor="var(--color-sun)" />
          <stop offset="1" stopColor="var(--color-sun)" />
        </linearGradient>
      </defs>
      <path d={STAR_PATH} fill={`url(#${id}-rim)`} strokeWidth="1.8" strokeLinejoin="round" style={outline} />
      <path
        d={STAR_PATH}
        transform="translate(12 12.4) scale(0.8) translate(-12 -12.4)"
        fill={`url(#${id}-body)`}
        stroke={`url(#${id}-body)`}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse
        cx="9.6"
        cy="8.9"
        rx="1.7"
        ry="0.95"
        transform="rotate(-38 9.6 8.9)"
        fill="var(--color-background)"
        opacity="0.9"
      />
      <ellipse
        cx="17"
        cy="10.5"
        rx="1.3"
        ry="0.5"
        transform="rotate(8 17 10.5)"
        fill="var(--color-background)"
        opacity="0.75"
      />
    </svg>
  );
}
