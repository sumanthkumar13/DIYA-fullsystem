import api from "@/lib/api";

export interface AnalyticsSummary {
  todaySales: number;
  monthSales: number;
  outstandingPayments: number;
  ordersThisMonth: number;
  averageOrderValue: number;
}

export interface TopSellingProduct {
  productId: string;
  productName: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface SlowMovingProduct {
  productId: string;
  productName: string;
  currentStock: number;
  lastSoldAt: string | null;
}

export interface TopRetailer {
  retailerId: string;
  retailerName: string;
  totalOrders: number;
  totalRevenue: number;
}

export interface RetailerPendingPayment {
  retailerId: string;
  retailerName: string;
  outstandingAmount: number;
  lastPaymentAt: string | null;
}

export interface MonthlySalesRow {
  year: number;
  month: number; // 1-12
  totalRevenue: number;
  totalOrders: number;
}

export interface OrderStatusSummary {
  pendingOrders: number;
  dispatchedOrders: number;
  deliveredOrders: number;
}

export type TerritoryStatus = "GOLD" | "SILVER" | "RISK";

export interface TerritoryPerformanceRow {
  region: string;
  revenue: number;
  outstanding: number;
  overdue: number;
  activeRetailers: number;
  totalRetailers: number;
  status: TerritoryStatus;
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await api.get("/analytics/summary");
  return res.data;
}

export async function fetchTopProducts(limit = 10): Promise<TopSellingProduct[]> {
  const res = await api.get("/analytics/top-products", { params: { limit } });
  return res.data || [];
}

export async function fetchSlowProducts(days = 30, limit = 10): Promise<SlowMovingProduct[]> {
  const res = await api.get("/analytics/slow-products", { params: { days, limit } });
  return res.data || [];
}

export async function fetchTopRetailers(limit = 10): Promise<TopRetailer[]> {
  const res = await api.get("/analytics/top-retailers", { params: { limit } });
  return res.data || [];
}

export async function fetchPendingPayments(limit = 10): Promise<RetailerPendingPayment[]> {
  const res = await api.get("/analytics/pending-payments", { params: { limit } });
  return res.data || [];
}

export async function fetchMonthlySales(): Promise<MonthlySalesRow[]> {
  const res = await api.get("/analytics/monthly-sales");
  return res.data || [];
}

export async function fetchOrderStatus(): Promise<OrderStatusSummary> {
  const res = await api.get("/analytics/order-status");
  return res.data;
}

export async function fetchTerritoryPerformance(
  sort: "revenue" | "risk" = "revenue"
): Promise<TerritoryPerformanceRow[]> {
  const res = await api.get("/analytics/territory-performance", { params: { sort } });
  const raw = res.data;
  if (!Array.isArray(raw)) return [];
  return raw.map((row: any) => ({
    region: String(row.region ?? ""),
    revenue: Number(row.revenue ?? 0),
    outstanding: Number(row.outstanding ?? 0),
    overdue: Number(row.overdue ?? 0),
    activeRetailers: Number(row.activeRetailers ?? 0),
    totalRetailers: Number(row.totalRetailers ?? 0),
    status: (row.status === "GOLD" || row.status === "SILVER" || row.status === "RISK"
      ? row.status
      : "SILVER") as TerritoryStatus,
  }));
}

