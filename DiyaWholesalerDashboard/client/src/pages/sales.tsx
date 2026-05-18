import { useCallback, useEffect, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useSalesDetails, SALES_PAGE_SIZE } from "@/hooks/useDashboard";
import { useRetailerRegions } from "@/hooks/useRetailerRegions";
import { formatINR } from "@/lib/money";
import {
  KPI_PERIOD_OPTIONS,
  buildSalesHref,
  parseSalesUrlSearch,
  type KpiTimePeriod,
} from "@/lib/kpiPeriod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ReceiptIndianRupee, ChevronLeft, ChevronRight, Store, CalendarRange } from "lucide-react";

export default function SalesPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { region, period, page } = useMemo(() => parseSalesUrlSearch(search), [search]);
  const { data: regions = [], isLoading: regionsLoading } = useRetailerRegions();

  const applyRegion = useCallback(
    (next: string) => {
      setLocation(buildSalesHref(next, period, 0));
    },
    [setLocation, period],
  );

  const applyPeriod = useCallback(
    (next: KpiTimePeriod) => {
      setLocation(buildSalesHref(region, next, 0));
    },
    [setLocation, region],
  );

  useEffect(() => {
    if (regionsLoading || regions.length === 0) return;
    if (region !== "all" && !regions.includes(region)) {
      applyRegion("all");
    }
  }, [regionsLoading, regions, region, applyRegion]);

  const { data, isLoading, isError, error, refetch, isFetching } = useSalesDetails(region, period, page);

  /** If URL `page` is past the last page (e.g. after filters shrink the result set), snap to last page. */
  useEffect(() => {
    if (isLoading || isError || !data) return;
    const tp = Math.max(1, data.totalPages ?? 1);
    if (page > tp - 1) {
      setLocation(buildSalesHref(region, period, tp - 1), { replace: true });
    }
  }, [isLoading, isError, data, page, region, period, setLocation]);

  const headingLabel = useMemo(() => {
    if (data?.rangeLabel) return data.rangeLabel;
    if (!data?.day?.year) return "";
    const d = new Date(data.day.year, data.day.month - 1, data.day.day);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }, [data?.rangeLabel, data?.day]);

  const errMsg =
    isError && error
      ? (error as any)?.response?.data?.message ?? (error instanceof Error ? error.message : "Failed to load sales")
      : null;

  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-primary transition-colors">
              Dashboard
            </Link>
            <span aria-hidden>/</span>
            <span className="text-gray-900 font-medium">Sales</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Sales details</h1>
          <p className="text-sm text-gray-500 max-w-xl">
            Accepted order totals for the selected period (cash, UPI, or credit). Edits update amounts automatically;
            cancelled or rejected orders are excluded. Choose region and period below.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto sm:justify-end">
          <div className="flex flex-wrap items-center gap-2 bg-white px-2 py-1.5 rounded-xl shadow-sm border border-gray-100">
            <CalendarRange className="h-4 w-4 text-primary shrink-0 ml-1 hidden sm:inline" aria-hidden />
            <Select value={period} onValueChange={(v) => applyPeriod(v as KpiTimePeriod)}>
              <SelectTrigger className="min-w-[7.5rem] h-9 border-0 bg-transparent focus:ring-0 font-medium text-gray-700 shadow-none text-sm">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent align="end">
                {KPI_PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-xl shadow-sm border border-gray-100 max-w-full">
            <MapPin className="h-4 w-4 text-primary shrink-0 ml-1" aria-hidden />
            <Select value={region} onValueChange={applyRegion} disabled={regionsLoading}>
              <SelectTrigger className="min-w-[10rem] max-w-[220px] border-0 bg-transparent focus:ring-0 font-medium text-gray-700 shadow-none h-9 text-sm">
                <SelectValue placeholder={regionsLoading ? "Loading regions…" : "Region"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2 min-w-0">
            <ReceiptIndianRupee className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{headingLabel ? `Sales — ${headingLabel}` : "Sales"}</span>
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : errMsg ? (
            <p className="text-sm text-red-600">{errMsg}</p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total for selected region and period</p>
                  <p className="text-3xl font-display font-bold text-gray-900 mt-1">{formatINR(data?.dayTotalSales)}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {(data?.totalElements ?? 0).toLocaleString("en-IN")} retailer
                    {(data?.totalElements ?? 0) === 1 ? "" : "s"} in this view
                  </p>
                </div>
              </div>

              {(data?.content?.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 py-14 px-4 text-center">
                  <Store className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden />
                  <p className="text-sm font-medium text-gray-700">No sales in this period for the selected region</p>
                  <p className="text-xs text-gray-500 mt-1">Accept an order to see it listed here.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-100 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                        <TableHead className="font-semibold">Retailer (shop)</TableHead>
                        <TableHead className="text-right font-semibold">Sales</TableHead>
                        <TableHead className="w-[100px] text-right hidden sm:table-cell font-semibold"> </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data!.content.map((row) => (
                        <TableRow key={row.retailerId} className="hover:bg-gray-50/60">
                          <TableCell className="font-medium text-gray-900 max-w-[200px] sm:max-w-none">
                            <span className="line-clamp-2">{row.shopName}</span>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{formatINR(row.totalSales)}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">
                            <Button variant="ghost" size="sm" asChild className="text-primary">
                              <Link href={`/retailers/${row.retailerId}`}>Profile</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {totalPages > 1 || (data?.totalElements ?? 0) > SALES_PAGE_SIZE ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Page {(page + 1).toLocaleString("en-IN")} of {totalPages.toLocaleString("en-IN")} ·{" "}
                    {SALES_PAGE_SIZE.toLocaleString("en-IN")} per page
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canPrev}
                      onClick={() => setLocation(buildSalesHref(region, period, Math.max(0, page - 1)))}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canNext}
                      onClick={() => setLocation(buildSalesHref(region, period, page + 1))}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
