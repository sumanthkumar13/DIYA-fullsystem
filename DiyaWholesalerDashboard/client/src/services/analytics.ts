import api from "@/lib/api";
import type { KpiTimePeriod } from "@/lib/kpiPeriod";

export interface AnalyticsSummary {
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
  outstandingDue: number;
  averageOrderValue: number;
}

export interface MonthlySalesRow {
  year: number;
  month: number; // 1-12
  totalRevenue: number;
  totalOrders: number;
}

export type SalesTrendGranularity = "DAILY" | "WEEKLY" | "MONTHLY";

export interface SalesTrendPoint {
  label: string;
  key: string;
  year: number;
  month: number;
  day: number;
  revenue: number;
  orderCount: number;
}

export interface SalesTrend {
  granularity: SalesTrendGranularity;
  points: SalesTrendPoint[];
  totalRevenue: number;
  comparisonRevenue: number;
}

export interface RetailerSalesContribution {
  retailerId: string;
  shopName: string;
  amount: number;
  percentage: number;
}

export interface MonthlyRetailerBreakdown {
  year: number;
  month: number;
  monthLabel: string;
  monthTotal: number;
  content: RetailerSalesContribution[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface OrderStatusSummary {
  pendingOrders: number;
  dispatchedOrders: number;
  deliveredOrders: number;
}

export interface RegionOrderCount {
  region: string;
  orderCount: number;
}

export interface OrdersByRegion {
  totalOrders: number;
  regions: RegionOrderCount[];
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

function analyticsParams(region?: string, period?: KpiTimePeriod) {
  const regionParam = !region || region === "all" ? undefined : region;
  return {
    ...(regionParam ? { region: regionParam } : {}),
    ...(period ? { period } : {}),
  };
}

export async function fetchTopProducts(
  limit = 10,
  region?: string,
  period: KpiTimePeriod = "THIS_MONTH",
): Promise<TopSellingProduct[]> {
  const res = await api.get("/analytics/top-products", {
    params: { limit, ...analyticsParams(region, period) },
  });
  return res.data || [];
}

export async function fetchSlowProducts(
  days = 30,
  limit = 10,
  region?: string,
  period: KpiTimePeriod = "THIS_MONTH",
): Promise<SlowMovingProduct[]> {
  const res = await api.get("/analytics/slow-products", {
    params: { days, limit, ...analyticsParams(region, period) },
  });
  return res.data || [];
}

export async function fetchTopRetailers(
  limit = 10,
  region?: string,
  period: KpiTimePeriod = "THIS_MONTH",
): Promise<TopRetailer[]> {
  const res = await api.get("/analytics/top-retailers", {
    params: { limit, ...analyticsParams(region, period) },
  });
  const rows = res.data;
  if (!Array.isArray(rows)) return [];
  return rows.map((r: Record<string, unknown>) => ({
    retailerId: String(r.retailerId ?? ""),
    retailerName: String(r.retailerName ?? "Retailer"),
    totalOrders: Number(r.totalOrders ?? 0),
    totalRevenue: Number(r.totalRevenue ?? 0),
    outstandingDue: Number(r.outstandingDue ?? 0),
    averageOrderValue: Number(r.averageOrderValue ?? 0),
  }));
}

export async function fetchSalesTrend(
  granularity: SalesTrendGranularity,
  region?: string,
  period: KpiTimePeriod = "THIS_MONTH",
): Promise<SalesTrend> {
  const res = await api.get("/analytics/sales-trend", {
    params: {
      granularity,
      ...analyticsParams(region, period),
    },
  });
  const data = res.data ?? {};
  return {
    granularity: (data.granularity ?? granularity) as SalesTrendGranularity,
    points: Array.isArray(data.points)
      ? data.points.map((p: Record<string, unknown>) => ({
          label: String(p.label ?? ""),
          key: String(p.key ?? ""),
          year: Number(p.year ?? 0),
          month: Number(p.month ?? 0),
          day: Number(p.day ?? 0),
          revenue: Number(p.revenue ?? 0),
          orderCount: Number(p.orderCount ?? 0),
        }))
      : [],
    totalRevenue: Number(data.totalRevenue ?? 0),
    comparisonRevenue: Number(data.comparisonRevenue ?? 0),
  };
}

export async function fetchMonthlyRetailerBreakdown(
  year: number,
  month: number,
  region?: string,
  page = 0,
  size = 15,
): Promise<MonthlyRetailerBreakdown> {
  const regionParam = !region || region === "all" ? undefined : region;
  const res = await api.get("/analytics/month-retailers", {
    params: {
      year,
      month,
      page,
      size,
      ...(regionParam ? { region: regionParam } : {}),
    },
  });
  const data = res.data ?? {};
  return {
    year: Number(data.year ?? year),
    month: Number(data.month ?? month),
    monthLabel: String(data.monthLabel ?? ""),
    monthTotal: Number(data.monthTotal ?? 0),
    content: Array.isArray(data.content)
      ? data.content.map((r: Record<string, unknown>) => ({
          retailerId: String(r.retailerId ?? ""),
          shopName: String(r.shopName ?? "Retailer"),
          amount: Number(r.amount ?? 0),
          percentage: Number(r.percentage ?? 0),
        }))
      : [],
    page: Number(data.page ?? page),
    size: Number(data.size ?? size),
    totalElements: Number(data.totalElements ?? 0),
    totalPages: Number(data.totalPages ?? 1),
  };
}

export async function fetchMonthlySales(): Promise<MonthlySalesRow[]> {
  const res = await api.get("/analytics/monthly-sales");
  return res.data || [];
}

export async function fetchOrderStatus(): Promise<OrderStatusSummary> {
  const res = await api.get("/analytics/order-status");
  return res.data;
}

export async function fetchOrdersByRegion(
  period: KpiTimePeriod = "THIS_MONTH",
): Promise<OrdersByRegion> {
  const res = await api.get("/analytics/orders-by-region", {
    params: { period },
  });
  const data = res.data ?? {};
  return {
    totalOrders: Number(data.totalOrders ?? 0),
    regions: Array.isArray(data.regions)
      ? data.regions.map((r: Record<string, unknown>) => ({
          region: String(r.region ?? ""),
          orderCount: Number(r.orderCount ?? 0),
        }))
      : [],
  };
}

export async function fetchTerritoryPerformance(): Promise<TerritoryPerformanceRow[]> {
  const res = await api.get("/analytics/territory-performance");
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

