import { AdminPage } from '@/features/shell/admin-page';
import { OrdersWorkspace } from '@/features/orders/orders-workspace';

export default function OrdersPage() {
  return (
    <AdminPage label="admin.orders">
      <OrdersWorkspace />
    </AdminPage>
  );
}
