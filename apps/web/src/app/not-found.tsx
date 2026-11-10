import { vi } from '@tripflix/i18n';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="content" className="ota-container empty-state">
      <h1>{vi.demo.web.notFoundTitle}</h1>
      <p>{vi.demo.web.notFoundBody}</p>
      <Link prefetch={false} href="/search" className="primary-button">
        {vi.demo.common.explore}
      </Link>
    </main>
  );
}
