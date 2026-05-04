import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { fetchTerritoryPerformance } from "@/services/analytics";

/** @param region "all" or a region name; only affects KPI cards */
export function useDashboardKpi(region: string) {
  const regionParam = !region || region === "all" ? undefined : region;
  return useQuery({
    queryKey: ["dashboard-kpi", regionParam ?? "all"],
    queryFn: async () => {
      const res = await api.get("/wholesaler/dashboard/kpi", {
        params: regionParam ? { region: regionParam } : {},
      });
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useDashboardTerritory() {
  return useQuery({
    queryKey: ["dashboard-territory"],
    queryFn: async () => {
      const res = await api.get("/wholesaler/dashboard/territory");
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: async () => {
      const res = await api.get("/wholesaler/dashboard/activity");
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useTerritoryPerformance(sort: "revenue" | "risk" = "revenue") {
  return useQuery({
    queryKey: ["territory-performance", sort],
    queryFn: () => fetchTerritoryPerformance(sort),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
