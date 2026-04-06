import api from "@/lib/axios";

export interface OrderListItem {
  id: string;
  orderNumber?: string;
  retailerId?: string;
  retailer: string;
  location: string;
  amount: number;
  date: string;
  createdAt?: string;
  status: string; // PLACED, ACCEPTED, PACKING, DISPATCHED, DELIVERED, COMPLETED, CANCELLED, REJECTED
  items: number;
  exposure?: string;
  dueDate?: string | null;
  unpaidAmount?: number;
}

export interface CreateOrderItemPayload {
  productId: string;
  quantity: number;
}

export interface CreateOrderPayload {
  retailerId: string;
  items: CreateOrderItemPayload[];
  notes?: string;
}

/**
 * Fetch orders for logged-in wholesaler
 * Backend: GET /api/wholesaler/orders
 */
export async function fetchOrders(
  status?: string,
  search?: string,
  dateRange?: string,
  page?: number,
  size?: number
): Promise<OrderListItem[]> {
  const params: any = {};
  
  if (status && status !== "all") {
    params.status = status;
  }
  if (search && search.trim().length > 0) {
    params.search = search.trim();
  }
  if (dateRange && dateRange !== "all") {
    params.dateRange = dateRange;
  }
  if (page !== undefined) {
    params.page = page;
  }
  if (size !== undefined) {
    params.size = size;
  }

  const res = await api.get("/wholesaler/orders", { params });
  return res.data || [];
}

/**
 * Create order for a retailer (wholesaler-initiated).
 * Backend: POST /api/wholesaler/orders
 */
export async function createOrder(payload: CreateOrderPayload) {
  const res = await api.post("/wholesaler/orders", payload);
  return res.data;
}

/**
 * Accept an order
 * Backend: POST /api/wholesaler/orders/{orderId}/accept
 */
export async function acceptOrder(
  orderId: string,
  opts: { force?: boolean; paymentMode: "CASH" | "UPI" | "CREDIT"; creditDays?: number; approvedCreditAmount?: number }
) {
  const { force = false, paymentMode, creditDays, approvedCreditAmount } = opts;
  const body: Record<string, unknown> = { paymentMode, creditDays };
  if (paymentMode === "CREDIT" && approvedCreditAmount != null) {
    body.approvedCreditAmount = approvedCreditAmount;
  }
  const res = await api.post(
    `/wholesaler/orders/${orderId}/accept`,
    body,
    { params: { force } }
  );
  return res.data;
}

/**
 * Reject an order
 * Backend: POST /api/wholesaler/orders/{orderId}/reject
 */
export async function rejectOrder(orderId: string) {
  const res = await api.post(`/wholesaler/orders/${orderId}/reject`);
  return res.data;
}

/**
 * Get order detail for wholesaler
 * Backend: GET /api/wholesaler/orders/{orderId}
 */
export async function fetchOrderDetail(orderId: string) {
  const res = await api.get(`/wholesaler/orders/${orderId}`);
  return res.data;
}

/** GET /api/wholesaler/orders/retailer/{retailerId}/previous-due?excludeOrderId=... */
export async function fetchPreviousDue(retailerId: string, excludeOrderId?: string): Promise<number> {
  const res = await api.get(`/wholesaler/orders/retailer/${retailerId}/previous-due`, {
    params: excludeOrderId ? { excludeOrderId } : undefined,
  });
  return Number(res.data?.previousDue ?? 0);
}

export async function patchOrderCredit(
  orderId: string,
  body: { creditDays?: number; approvedCreditAmount?: number }
) {
  const res = await api.patch(`/wholesaler/orders/${orderId}/credit`, body);
  return res.data;
}

/**
 * Update order status
 * Backend: POST /api/wholesaler/orders/{orderId}/{action}
 */
export async function updateOrderStatus(
  orderId: string,
  action: "packing" | "dispatch" | "deliver" | "complete" | "cancel"
) {
  const res = await api.post(`/wholesaler/orders/${orderId}/${action}`);
  return res.data;
}

/**
 * Edit order (direct, no retailer approval)
 * Backend: POST /api/wholesaler/orders/{orderId}/edit
 */
export async function editOrder(
  orderId: string,
  payload: {
    reason: string;
    items: Array<{ orderItemId: string; newQty?: number; newUnitPrice?: number }>;
  }
) {
  const res = await api.post(`/wholesaler/orders/${orderId}/edit`, payload);
  return res.data;
}
