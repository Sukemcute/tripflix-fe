import { useId } from 'react';

// Sao năm cánh nhọn màu vàng, bóng đổ mềm phía dưới (CSS ở .chip svg).
export function SoftStarIcon({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-sun)" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--color-sun) 85%, var(--color-coral))" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.4 14.35 9.16 21.51 9.31 15.8 13.64 17.88 20.49 12 16.4 6.12 20.49 8.2 13.64 2.49 9.31 9.65 9.16Z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}
