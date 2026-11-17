import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { Card, EmptyState, PageHeader } from '../ui/primitives';

const ICONS = { orders: 'receipt', reports: 'report' } as const;

/** Trang chưa có API phía backend: nói rõ là chưa có dữ liệu, không hiện số giả. */
export function UnavailablePage({ kind }: { kind: keyof typeof ICONS }) {
  const copy = vi.adminConsole.unavailable[kind];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.title} />
      <Card>
        <EmptyState
          icon={ICONS[kind]}
          title={vi.adminConsole.noData}
          body={copy.body}
          action={
            <Link href="/" className="mt-2 text-sm font-semibold text-teal-ink underline-offset-4 hover:underline">
              {vi.adminConsole.unavailable.shortcut}
            </Link>
          }
        />
      </Card>
    </div>
  );
}
