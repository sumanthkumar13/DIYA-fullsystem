import api from "@/lib/api";

/**
 * GET /api/ledger/wholesaler/retailer/{retailerId}/outstanding
 * Uses existing api (Bearer token via interceptor).
 * Returns outstanding amount as number; 0 on failure.
 */
export async function getRetailerOutstanding(
  retailerId: string
): Promise<number> {
  try {
    const res = await api.get<{ retailerId: string; outstanding: number }>(
      `/ledger/wholesaler/retailer/${retailerId}/outstanding`
    );
    const value = res.data?.outstanding;
    return typeof value === "number" ? value : Number(value) || 0;
  } catch {
    return 0;
  }
}
