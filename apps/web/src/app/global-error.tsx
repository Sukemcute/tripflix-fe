'use client';

import { vi } from '@tripflix/i18n';
import { colors, fonts, radius, spacing } from '@tripflix/tokens';

/**
 * Lỗi ngay trong layout gốc: Next.js thay cả trang bằng màn này, nên phải tự có thẻ html, body và style inline
 * (CSS toàn cục của layout không được nạp).
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.lg,
          padding: spacing.lg,
          background: colors.surface,
          color: colors.text,
          fontFamily: fonts.sans,
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: 16 }}>{vi.api.error}</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            minHeight: 44,
            padding: `0 ${spacing.xl}px`,
            border: 0,
            borderRadius: radius.pill,
            background: colors.coral,
            color: colors.background,
            font: 'inherit',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {vi.api.retry}
        </button>
      </body>
    </html>
  );
}
