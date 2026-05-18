import api from "@/lib/axios";

/**
 * Fetch all retailers for the wholesaler
 * Backend: GET /api/wholesaler/retailers
 */
export async function fetchRetailers(): Promise<any[]> {
  const res = await api.get("/wholesaler/retailers");
  return res.data || [];
}

export type RetailerSearchResult = {
  id: string;
  name: string;
  shopName?: string;
  location?: string;
};

export async function searchRetailers(query: string): Promise<RetailerSearchResult[]> {
  const trimmed = query.trim();
  console.log("Searching retailers:", trimmed);
  const res = await api.get("/wholesaler/retailers/search", {
    params: trimmed ? { query: trimmed } : undefined,
  });
  return res.data;
}

export interface CreateRetailerPayload {
  retailerName: string;
  phone: string;
  shopName: string;
  /** India Post post office name (territory), same as wholesaler signup. */
  region: string;
  city?: string;
  state?: string;
  pincode?: string;
  address?: string;
  gstNumber?: string;
  creditLimit?: number;
  notes?: string;
}

/**
 * Create an invited retailer profile for the wholesaler.
 * Backend: POST /api/wholesaler/retailers
 */
export async function createRetailer(payload: CreateRetailerPayload) {
  const res = await api.post("/wholesaler/retailers", payload);
  const data = res.data as { success?: boolean; message?: string };
  if (data && data.success === false) {
    const err: Error & { response?: { status: number; data: unknown } } = new Error(
      typeof data.message === "string" ? data.message : "Request failed"
    ) as Error & { response?: { status: number; data: unknown } };
    err.response = { status: 400, data };
    throw err;
  }
  return res.data;
}
