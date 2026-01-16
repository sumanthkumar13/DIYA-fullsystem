import { api } from "@/lib/api";

export type VisibilityMode = "PUBLIC" | "PRIVATE";

export async function getVisibilityMode(): Promise<VisibilityMode> {
  const res = await api.get("/wholesaler/settings/visibility");
  return res.data.visibilityMode as VisibilityMode;
}

export async function updateVisibilityMode(mode: VisibilityMode): Promise<VisibilityMode> {
  const res = await api.put("/wholesaler/settings/visibility", {
    visibilityMode: mode,
  });
  return res.data.visibilityMode as VisibilityMode;
}
