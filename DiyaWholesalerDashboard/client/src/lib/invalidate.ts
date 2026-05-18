import type { QueryClient } from "@tanstack/react-query";

type InvalidateContext = {
  orderId?: string;
  retailerId?: string;
};

/**
 * Centralized cache invalidation after ANY financial mutation.
 * Goal: no stale values anywhere (orders, order detail, retailer credit, previous due, dashboards).
 */
export function invalidateAfterMutation(queryClient: QueryClient, ctx: InvalidateContext = {}) {
  const { orderId, retailerId } = ctx;

  // Orders
  queryClient.invalidateQueries({ queryKey: ["orders"] });
  if (orderId) queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });

  // Retailer scoped
  if (retailerId) {
    queryClient.invalidateQueries({ queryKey: ["retailer-orders", retailerId] });
    queryClient.invalidateQueries({ queryKey: ["retailer-credit", retailerId] });
    queryClient.invalidateQueries({ queryKey: ["retailer-credit-summary", retailerId] });
    queryClient.invalidateQueries({ queryKey: ["retailer-statement", retailerId] });
  }
  if (retailerId && orderId) {
    queryClient.invalidateQueries({ queryKey: ["previous-due", retailerId, orderId] });
  }

  // Ledger / payments
  queryClient.invalidateQueries({ queryKey: ["khatabook-summary"] });
  queryClient.invalidateQueries({ queryKey: ["khatabook-retailers"] });
  queryClient.invalidateQueries({ queryKey: ["pending-payments"] });

  // Dashboard + territory
  queryClient.invalidateQueries({ queryKey: ["retailer-regions"] });
  queryClient.invalidateQueries({ queryKey: ["territory-performance"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-territory"] });
  // KPI has a region param in key; invalidate all variants.
  queryClient.invalidateQueries({ queryKey: ["dashboard-kpi"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-kpi-widget"] });
  queryClient.invalidateQueries({ queryKey: ["sales-details"] });
  queryClient.invalidateQueries({ queryKey: ["analytics-sales-trend"] });
  queryClient.invalidateQueries({ queryKey: ["analytics-month-retailers"] });
  queryClient.invalidateQueries({ queryKey: ["analytics-top-retailers"] });
  queryClient.invalidateQueries({ queryKey: ["analytics-top-products"] });
  queryClient.invalidateQueries({ queryKey: ["analytics-slow-products"] });
  queryClient.invalidateQueries({ queryKey: ["analytics-orders-by-region"] });
}

