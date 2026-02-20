import api from "@/lib/axios";

export interface OrderListItem {
  id: string;
  orderNumber?: string;
  retailer: string;
  location: string;
  amount: number;
  date: string;
  status: string; // PLACED, ACCEPTED, PACKING, DISPATCHED, DELIVERED, COMPLETED, CANCELLED, REJECTED
  items: number;
  exposure?: string;
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
