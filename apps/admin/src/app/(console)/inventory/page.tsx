import { InventoryCalendar } from '@/features/inventory/inventory-calendar';
import { Card, PageHeader } from '@/features/ui/primitives';
import { vi } from '@tripflix/i18n';

export const metadata = { title: `${vi.admin.inventory} | ${vi.admin.title}` };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={vi.admin.inventory} />
      <Card className="p-5">
        <InventoryCalendar />
      </Card>
    </div>
  );
}
