import { useQuery } from "@tanstack/react-query";
import {
  fetchAnalyticsSummary,
  fetchMonthlySales,
  fetchOrderStatus,
  fetchPendingPayments,
  fetchSlowProducts,
  fetchTopProducts,
  fetchTopRetailers,
} from "@/services/analytics";

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ["analytics-summary"],
    queryFn: fetchAnalyticsSummary,
  });
}

export function useAnalyticsTopProducts(limit = 10) {
  return useQuery({
    queryKey: ["analytics-top-products", limit],
    queryFn: () => fetchTopProducts(limit),
  });
}

export function useAnalyticsSlowProducts(days = 30, limit = 10) {
  return useQuery({
    queryKey: ["analytics-slow-products", days, limit],
    queryFn: () => fetchSlowProducts(days, limit),
  });
}

export function useAnalyticsTopRetailers(limit = 10) {
  return useQuery({
    queryKey: ["analytics-top-retailers", limit],
    queryFn: () => fetchTopRetailers(limit),
  });
}

export function useAnalyticsPendingPayments(limit = 10) {
  return useQuery({
    queryKey: ["analytics-pending-payments", limit],
    queryFn: () => fetchPendingPayments(limit),
  });
}

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

