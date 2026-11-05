import { vi } from '@tripflix/i18n';

export default function Loading() {
  return (
    <main
      id="content"
      className="ota-container page-loading"
      aria-busy="true"
      aria-label={vi.demo.web.searchBusy}
    >
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-photo" />
      <div className="skeleton skeleton-copy" />
    </main>
  );
}
