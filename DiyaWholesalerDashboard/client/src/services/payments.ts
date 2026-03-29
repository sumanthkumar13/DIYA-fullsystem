import api from "@/lib/api";

export async function recordManualPayment(payload: {
  retailerId: string;
  amount: number;
  mode: string;
  note?: string;
}) {
  return await api.post("/ledger/wholesaler/record-payment", payload);
}

export type PendingPayment = {
  id: string;
  amount: number;
  mode: string;
  reference?: string | null;
  note?: string | null;
  createdAt?: string | null;
  status: string;
  retailer?: { id: string; user?: { name?: string | null } | null; shopName?: string | null } | null;
  order?: { id: string; orderNumber?: string | null } | null;
};

export async function fetchPendingPayments(): Promise<PendingPayment[]> {
  const res = await api.get("/wholesaler/payments/pending");
  return res.data;
}

export async function confirmPendingPayment(paymentId: string) {
  const res = await api.post(`/wholesaler/payments/${paymentId}/confirm`);
  return res.data;
}

export async function rejectPendingPayment(paymentId: string, reason?: string) {
  const res = await api.post(`/wholesaler/payments/${paymentId}/reject`, reason ? { reason } : {});
  return res.data;
}
