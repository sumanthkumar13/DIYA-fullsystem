import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { fetchTerritoryPerformance } from "@/services/analytics";
import { fetchSalesDetails } from "@/services/sales";

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

export function useTerritoryPerformance() {
  return useQuery({
    queryKey: ["territory-performance"],
    queryFn: () => fetchTerritoryPerformance(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useKpiWidget(metric: string, period: string, region: string) {
  const regionParam = !region || region === "all" ? undefined : region;
  const regionKey = regionParam ?? "all";
  return useQuery({
    queryKey: ["dashboard-kpi-widget", metric, period, regionKey],
    queryFn: async () => {
      const res = await api.get("/wholesaler/dashboard/kpi-widget", {
        params: {
          metric,
          period,
          ...(regionParam ? { region: regionParam } : {}),
        },
      });
      return res.data as {
        metric: string;
        period: string;
        value: string | number;
        comparisonValue: string | number;
      };
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

const SALES_PAGE_SIZE = 20;

export function useSalesDetails(region: string, period: string, page: number) {
  const regionKey = !region || region === "all" ? "all" : region;
  const periodKey = period || "TODAY";
  return useQuery({
    queryKey: ["sales-details", regionKey, periodKey, page, SALES_PAGE_SIZE],
    queryFn: () => fetchSalesDetails(region, periodKey, page, SALES_PAGE_SIZE),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export { SALES_PAGE_SIZE };
