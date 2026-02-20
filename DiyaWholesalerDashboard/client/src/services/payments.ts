import api from "@/lib/api";

export async function recordManualPayment(payload: {
  retailerId: string;
  amount: number;
  mode: string;
  note?: string;
}) {
  return await api.post("/ledger/wholesaler/record-payment", payload);
}
