import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export function useDashboardKpi() {
  return useQuery({
    queryKey: ["dashboard-kpi"],
    queryFn: async () => {
      const res = await api.get("/wholesaler/dashboard/kpi");
      return res.data;
    },
  });
}

export function useDashboardTerritory() {
  return useQuery({
    queryKey: ["dashboard-territory"],
    queryFn: async () => {
      const res = await api.get("/wholesaler/dashboard/territory");
      return res.data;
    },
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: async () => {
      const res = await api.get("/wholesaler/dashboard/activity");
      return res.data;
    },
  });
}
