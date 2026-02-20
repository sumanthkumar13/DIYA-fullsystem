import api from "@/lib/axios";

export interface TallyPingResponse {
  connected: boolean;
  companyName?: string;
}

/**
 * Check Tally connectivity and get current company name.
 * Backend: GET /api/tally/ping
 */
export async function tallyPing(): Promise<TallyPingResponse> {
  const res = await api.get<TallyPingResponse>("/tally/ping");
  return res.data;
}
