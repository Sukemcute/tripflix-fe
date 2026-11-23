'use client';

import { vi } from '@tripflix/i18n';

/** Lỗi ngay trong layout gốc: Next.js thay cả trang bằng màn này, nên phải tự có thẻ html, body. */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="vi">
      <body>
        <p>{vi.api.error}</p>
        <button type="button" onClick={() => reset()}>
          {vi.api.retry}
        </button>
      </body>
    </html>
  );
}
