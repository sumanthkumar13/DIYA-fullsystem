import { useQuery } from "@tanstack/react-query";
import {
  fetchMonthlyRetailerBreakdown,
  fetchMonthlySales,
  fetchOrderStatus,
  fetchSalesTrend,
  fetchSlowProducts,
  fetchTopProducts,
  fetchTopRetailers,
  fetchOrdersByRegion,
  type SalesTrendGranularity,
} from "@/services/analytics";
import type { KpiTimePeriod } from "@/lib/kpiPeriod";

export function useAnalyticsTopProducts(limit: number, region: string, period: KpiTimePeriod) {
  const regionKey = !region || region === "all" ? "all" : region;
  return useQuery({
    queryKey: ["analytics-top-products", limit, regionKey, period],
    queryFn: () => fetchTopProducts(limit, region, period),
  });
}

export function useAnalyticsSlowProducts(
  days: number,
  limit: number,
  region: string,
  period: KpiTimePeriod,
) {
  const regionKey = !region || region === "all" ? "all" : region;
  return useQuery({
    queryKey: ["analytics-slow-products", days, limit, regionKey, period],
    queryFn: () => fetchSlowProducts(days, limit, region, period),
  });
}

export function useAnalyticsTopRetailers(limit: number, region: string, period: KpiTimePeriod) {
  const regionKey = !region || region === "all" ? "all" : region;
  return useQuery({
    queryKey: ["analytics-top-retailers", limit, regionKey, period],
    queryFn: () => fetchTopRetailers(limit, region, period),
  });
}

export function useOrdersByRegion(period: KpiTimePeriod) {
  return useQuery({
    queryKey: ["analytics-orders-by-region", period],
    queryFn: () => fetchOrdersByRegion(period),
  });
}

export function useSalesTrend(
  granularity: SalesTrendGranularity,
  region: string,
  period: KpiTimePeriod,
) {
  const regionKey = !region || region === "all" ? "all" : region;
  return useQuery({
    queryKey: ["analytics-sales-trend", granularity, regionKey, period],
    queryFn: () => fetchSalesTrend(granularity, region, period),
  });
}

export function useMonthlyRetailerBreakdown(
  year: number | null,
  month: number | null,
  region: string,
  page: number,
) {
  const regionKey = !region || region === "all" ? "all" : region;
  const enabled = year != null && month != null && year > 0 && month >= 1 && month <= 12;
  return useQuery({
    queryKey: ["analytics-month-retailers", year, month, regionKey, page],
    queryFn: () => fetchMonthlyRetailerBreakdown(year!, month!, region, page, 15),
    enabled,
  });
}

/** Legacy exports kept for any remaining callers */
export function useAnalyticsMonthlySales() {
  return useQuery({
    queryKey: ["analytics-monthly-sales"],
    queryFn: fetchMonthlySales,
  });
}

export function useAnalyticsOrderStatus() {
  return useQuery({
    queryKey: ["analytics-order-status"],
    queryFn: fetchOrderStatus,
  });
}
