import { api } from "@/lib/api";

/** GET /api/regions/active — distinct retailer regions (APPROVED connections), wholesaler JWT required */
export async function fetchActiveRegions(): Promise<string[]> {
  const res = await api.get<string[]>("/regions/active");
  return Array.isArray(res.data) ? res.data : [];
}
