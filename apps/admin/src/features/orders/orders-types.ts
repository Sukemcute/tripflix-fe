import { vi } from '@tripflix/i18n';

// API admin của TF43 chưa khai báo DTO trả về trong OpenAPI nên hàm sinh ra có data: void.
// Kiểu ở đây chép theo AdminOrdersStore (BE commerce/admin); thêm DTO bên BE thì đổi sang kiểu sinh ra.
export type OrderStatus = keyof typeof vi.adminOrders.status;
export type AnomalyKind = keyof typeof vi.adminOrders.kinds;
export const ORDER_STATUSES = Object.keys(vi.adminOrders.status) as OrderStatus[];
export const ANOMALY_KINDS = Object.keys(vi.adminOrders.kinds) as AnomalyKind[];

export interface AdminOrder {
  id: string;
  userId: string;
  status: OrderStatus;
  total: number;
  confirmationCode: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  createdAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
}

export interface OrderPage {
  items: AdminOrder[];
  nextBefore: string | null;
}

export interface Anomaly {
  kind: AnomalyKind;
  orderId: string;
  confirmationCode: string | null;
  orderStatus: OrderStatus;
  total: number;
  detail: Record<string, unknown>;
  since: string;
}

export interface AnomalyList {
  items: Anomaly[];
  counts: Partial<Record<AnomalyKind, number>>;
}

export interface OrderDetail {
  order: AdminOrder;
  items: {
    id: string;
    productType: 'room' | 'flight';
    productId: string;
    productName: string;
    date: string;
    nights: number;
    qty: number;
    lineTotal: number;
    ratePlanCode: string;
    confirmationCode: string | null;
  }[];
  guests: { fullName: string; birthdate: string | null; passengerType: string | null }[];
  payments: {
    id: string;
    gateway: string;
    status: string;
    amount: number;
    gatewayRef: string | null;
    failureCode: string | null;
    cardLast4: string | null;
    needsReview: boolean;
    createdAt: string;
  }[];
  refunds: {
    id: string;
    amount: number;
    reason: string;
    status: string;
    gatewayRef: string | null;
    needsReview: boolean;
    createdAt: string;
  }[];
  history: {
    fromStatus: string | null;
    toStatus: string;
    source: string | null;
    requestId: string | null;
    createdAt: string;
  }[];
  anomalies: { kind: AnomalyKind; detail: Record<string, unknown>; since: string }[];
}

export interface AdminProduct {
  id: string;
  name: string;
  parentName: string;
  place: string;
}
