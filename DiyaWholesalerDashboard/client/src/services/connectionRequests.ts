import api from "@/lib/api";

export type ConnectionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ConnectionRequestDTO = {
  id: string;
  status: ConnectionStatus;

  retailerId?: string;
  retailerBusinessName?: string;
  retailerCity?: string;
  retailerPhone?: string;

  wholesalerId?: string;
  wholesalerBusinessName?: string;
  wholesalerHandle?: string;
  wholesalerCity?: string;
};

export async function fetchPendingRequests(): Promise<ConnectionRequestDTO[]> {
  const res = await api.get("/wholesaler/connections/requests");
  return res.data;
}

export async function updateRequestStatus(
  connectionId: string,
  status: "APPROVED" | "REJECTED"
): Promise<ConnectionRequestDTO> {
  const res = await api.put(`/wholesaler/connections/${connectionId}`, { status });
  return res.data;
}
