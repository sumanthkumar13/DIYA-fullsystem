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
  region: string;
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
  return res.data;
}
