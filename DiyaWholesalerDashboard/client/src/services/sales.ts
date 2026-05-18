import api from "@/lib/api";

export type SalesDayDTO = {
  year: number;
  month: number;
  day: number;
};

export type SalesRetailerRow = {
  retailerId: string;
  shopName: string;
  totalSales: number;
};

export type SalesDetailsPage = {
  dayTotalSales: number;
  day: SalesDayDTO;
  period: string;
  rangeLabel: string;
  content: SalesRetailerRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export async function fetchSalesDetails(
  region: string | undefined,
  period: string,
  page: number,
  size: number,
): Promise<SalesDetailsPage> {
  const regionParam = !region || region === "all" ? undefined : region;
  const res = await api.get("/wholesaler/dashboard/sales-details", {
    params: {
      period: period || "TODAY",
      page,
      size,
      ...(regionParam ? { region: regionParam } : {}),
    },
  });
  const d = res.data;
  return {
    dayTotalSales: Number(d.dayTotalSales ?? 0),
    day: {
      year: Number(d.day?.year ?? 0),
      month: Number(d.day?.month ?? 0),
      day: Number(d.day?.day ?? 0),
    },
    period: String(d.period ?? "TODAY"),
    rangeLabel: String(d.rangeLabel ?? ""),
    content: Array.isArray(d.content)
      ? d.content.map((r: any) => ({
          retailerId: String(r.retailerId ?? ""),
          shopName: String(r.shopName ?? "Retailer"),
          totalSales: Number(r.totalSales ?? 0),
        }))
      : [],
    page: Number(d.page ?? 0),
    size: Number(d.size ?? 20),
    totalElements: Number(d.totalElements ?? 0),
    totalPages: Number(d.totalPages ?? 1),
  };
}
