import api from "@/lib/api";

export type VisibilityMode = "PUBLIC" | "PRIVATE";

export interface WholesalerSettingsDTO {
  businessName: string | null;
  ownerName: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  businessType: string | null;
  visibilityMode: VisibilityMode;
  email: string | null;
}

export async function getWholesalerSettings(): Promise<WholesalerSettingsDTO> {
  const res = await api.get<WholesalerSettingsDTO>("/wholesaler/settings");
  return res.data;
}

export async function updateWholesalerSettings(
  payload: Partial<WholesalerSettingsDTO>
): Promise<WholesalerSettingsDTO> {
  const res = await api.put<WholesalerSettingsDTO>("/wholesaler/settings", payload);
  return res.data;
}

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type ChangePasswordResponse = {
  success: boolean;
  message: string;
};

/** PUT /api/wholesaler/settings/password — requires JWT */
export async function changeWholesalerPassword(
  payload: ChangePasswordPayload
): Promise<ChangePasswordResponse> {
  const res = await api.put<ChangePasswordResponse>("/wholesaler/settings/password", payload);
  return res.data;
}
