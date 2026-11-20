import { AdminPage } from '@/features/shell/admin-page';
import { InventoryCalendar } from '@/features/inventory/inventory-calendar';

export default function InventoryPage() {
  return (
    <AdminPage label="admin.inventory">
      <InventoryCalendar />
    </AdminPage>
  );
}
