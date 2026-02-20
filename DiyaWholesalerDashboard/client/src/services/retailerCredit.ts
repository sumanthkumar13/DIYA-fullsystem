import api from "@/lib/api";

export async function fetchRetailerCreditSummary(retailerId: string) {
  const res = await api.get(`/ledger/wholesaler/retailer/${retailerId}/credit-summary`);
  return res.data;
}
