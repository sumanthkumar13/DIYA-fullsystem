import api from "@/lib/api";

export interface RetailerCreditSummary {
  retailerId: string;
  retailerName: string;
  /** Unpaid total across accepted orders (includes overdue). */
  totalOutstanding: number;
  /** Unpaid but not overdue (accepted orders only). */
  outstandingAmount?: number;
  /** Unpaid and overdue (accepted orders only). */
  overdueAmount?: number;
  creditGiven?: number;
  creditLimit: number;
  availableCredit: number;
  overdueDays: number;
  lastPaymentDate?: string | null;
  lastOrderDate?: string | null;
  shopName?: string;
  phoneContact?: string;
  address?: string;
  city?: string;
  state?: string;
  proprietorName?: string;
  totalCompletedPurchaseValue?: number;
  tier?: string;
}

/** GET /api/wholesaler/retailers/{id}/credit-summary */
export async function fetchRetailerCreditSummary(retailerId: string): Promise<RetailerCreditSummary> {
  const res = await api.get(`/wholesaler/retailers/${retailerId}/credit-summary`);
  return res.data;
}

/** PATCH /api/wholesaler/retailers/{id}/credit-limit — body { creditLimit: number | null } */
export async function patchRetailerCreditLimit(
  retailerId: string,
  creditLimit: number | null
): Promise<{ success: boolean; creditLimit?: number | null; message?: string }> {
  const res = await api.patch(`/wholesaler/retailers/${retailerId}/credit-limit`, {
    creditLimit,
  });
  return res.data;
}
