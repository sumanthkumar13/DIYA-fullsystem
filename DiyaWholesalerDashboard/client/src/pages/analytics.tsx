import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertCircle, ClipboardList, LineChart, Package, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useAnalyticsSlowProducts,
  useAnalyticsTopProducts,
  useAnalyticsTopRetailers,
  useMonthlyRetailerBreakdown,
  useOrdersByRegion,
  useSalesTrend,
} from "@/hooks/useAnalytics";
import { useRetailerRegions } from "@/hooks/useRetailerRegions";
import { useCardRegionGuard } from "@/hooks/useCardRegionGuard";
import { SalesTrendChart } from "@/components/analytics/SalesTrendChart";
import { MonthRetailerBreakdown } from "@/components/analytics/MonthRetailerBreakdown";
import { RankedBarChart } from "@/components/analytics/RankedBarChart";
import { RegionOrdersBarChart } from "@/components/analytics/RegionOrdersBarChart";
import { AnalyticsCardFilters } from "@/components/analytics/AnalyticsCardFilters";
import { CHART_COLORS } from "@/lib/analyticsChart";
import { periodLabel } from "@/lib/analyticsPeriodLabel";
import { formatINR } from "@/lib/money";
import type { KpiTimePeriod } from "@/lib/kpiPeriod";
import type { SalesTrendGranularity, SalesTrendPoint } from "@/services/analytics";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const DEFAULT_PERIOD: KpiTimePeriod = "THIS_MONTH";

export default function Analytics() {
  const { data: regions = [], isLoading: regionsLoading } = useRetailerRegions();

  const [trendRegion, setTrendRegion] = useState("all");
  const [granularity, setGranularity] = useState<SalesTrendGranularity>("MONTHLY");
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number; key: string } | null>(null);
  const [drilldownPage, setDrilldownPage] = useState(0);
  const [drilldownRegion, setDrilldownRegion] = useState("all");

  const [productsRegion, setProductsRegion] = useState("all");
  const [productsPeriod, setProductsPeriod] = useState<KpiTimePeriod>(DEFAULT_PERIOD);

  const [slowRegion, setSlowRegion] = useState("all");
  const [slowPeriod, setSlowPeriod] = useState<KpiTimePeriod>(DEFAULT_PERIOD);

  const [retailersRegion, setRetailersRegion] = useState("all");
  const [retailersPeriod, setRetailersPeriod] = useState<KpiTimePeriod>(DEFAULT_PERIOD);

  const [ordersPeriod, setOrdersPeriod] = useState<KpiTimePeriod>(DEFAULT_PERIOD);

  useCardRegionGuard(trendRegion, regions, regionsLoading, setTrendRegion);
  useCardRegionGuard(productsRegion, regions, regionsLoading, setProductsRegion);
  useCardRegionGuard(slowRegion, regions, regionsLoading, setSlowRegion);
  useCardRegionGuard(retailersRegion, regions, regionsLoading, setRetailersRegion);
  useCardRegionGuard(drilldownRegion, regions, regionsLoading, setDrilldownRegion);

  const trendQ = useSalesTrend(granularity, trendRegion, DEFAULT_PERIOD);
  const topProductsQ = useAnalyticsTopProducts(8, productsRegion, productsPeriod);
  const slowProductsQ = useAnalyticsSlowProducts(30, 8, slowRegion, slowPeriod);
  const topRetailersQ = useAnalyticsTopRetailers(8, retailersRegion, retailersPeriod);
  const ordersByRegionQ = useOrdersByRegion(ordersPeriod);

  const drilldownQ = useMonthlyRetailerBreakdown(
    selectedMonth?.year ?? null,
    selectedMonth?.month ?? null,
    drilldownRegion,
    drilldownPage,
  );

  useEffect(() => {
    setSelectedMonth(null);
  }, [trendRegion]);

  useEffect(() => {
    setDrilldownPage(0);
  }, [drilldownRegion]);

  const handleSelectMonth = useCallback((point: SalesTrendPoint) => {
    setSelectedMonth({ year: point.year, month: point.month, key: point.key });
    setDrilldownPage(0);
  }, []);

  const handleGranularityChange = (g: SalesTrendGranularity) => {
    setGranularity(g);
    if (g !== "MONTHLY") setSelectedMonth(null);
  };

  const productRows = (topProductsQ.data ?? []).map((r) => ({
    id: r.productId,
    label: r.productName,
    value: r.totalRevenue ?? 0,
    sublabel: `${(r.totalQuantitySold ?? 0).toLocaleString("en-IN")} units`,
  }));

  const retailerRows = (topRetailersQ.data ?? []).map((r) => {
    const orders = r.totalOrders ?? 0;
    const revenue = r.totalRevenue ?? 0;
    return {
      id: r.retailerId,
      label: r.retailerName,
      value: revenue,
      sublabel: `${orders.toLocaleString("en-IN")} orders`,
      detailLines: [
        `Total orders: ${orders.toLocaleString("en-IN")} (accepted in period)`,
        `Total revenue: ${formatINR(revenue)}`,
        `Outstanding due: ${formatINR(r.outstandingDue ?? 0)}`,
        `Avg order value: ${formatINR(r.averageOrderValue ?? 0)}`,
      ],
    };
  });

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-primary" />
          Business Insights
        </h1>
        <p className="text-sm text-gray-500 mt-1 max-w-xl">
          Each chart has its own region and date filters so you can compare different views side by side.
        </p>
      </div>

      <InsightCard
        title="Sales trend"
        icon={<LineChart className="h-4 w-4 text-primary" />}
        filters={
          <div className="flex flex-row flex-wrap items-center gap-2 justify-end w-full">
            <AnalyticsCardFilters
              region={trendRegion}
              period={DEFAULT_PERIOD}
              regions={regions}
              regionsLoading={regionsLoading}
              onRegionChange={setTrendRegion}
              onPeriodChange={() => {}}
              showPeriod={false}
              className="w-auto"
            />
            <Tabs
              value={granularity}
              onValueChange={(v) => handleGranularityChange(v as SalesTrendGranularity)}
            >
              <TabsList className="grid w-full grid-cols-3 h-9 sm:w-auto">
                <TabsTrigger value="DAILY" className="text-xs sm:text-sm">
                  Daily
                </TabsTrigger>
                <TabsTrigger value="WEEKLY" className="text-xs sm:text-sm">
                  Weekly
                </TabsTrigger>
                <TabsTrigger value="MONTHLY" className="text-xs sm:text-sm">
                  Monthly
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      >
        <SalesTrendChart
          data={trendQ.data}
          granularity={granularity}
          isLoading={trendQ.isLoading}
          isError={trendQ.isError}
          onRetry={() => trendQ.refetch()}
          selectedMonthKey={selectedMonth?.key ?? null}
          onSelectMonth={granularity === "MONTHLY" ? handleSelectMonth : undefined}
        />
      </InsightCard>

      {selectedMonth && granularity === "MONTHLY" ? (
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">Retailer split</CardTitle>
              <AnalyticsCardFilters
                region={drilldownRegion}
                period={DEFAULT_PERIOD}
                regions={regions}
                regionsLoading={regionsLoading}
                onRegionChange={setDrilldownRegion}
                onPeriodChange={() => {}}
                showPeriod={false}
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <MonthRetailerBreakdown
              year={selectedMonth.year}
              month={selectedMonth.month}
              monthLabel={drilldownQ.data?.monthLabel ?? ""}
              data={drilldownQ.data}
              isLoading={drilldownQ.isLoading}
              isError={drilldownQ.isError}
              page={drilldownPage}
              onPageChange={setDrilldownPage}
              onClose={() => setSelectedMonth(null)}
              onRetry={() => drilldownQ.refetch()}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InsightCard
          title="Top selling products"
          subtitle={periodLabel(productsPeriod)}
          icon={<Package className="h-4 w-4 text-primary" />}
          filters={
            <AnalyticsCardFilters
              region={productsRegion}
              period={productsPeriod}
              regions={regions}
              regionsLoading={regionsLoading}
              onRegionChange={setProductsRegion}
              onPeriodChange={setProductsPeriod}
            />
          }
        >
          <RankedBarChart
            rows={productRows}
            valueLabel="Revenue"
            barColor={CHART_COLORS.salesUp}
            isLoading={topProductsQ.isLoading}
            isError={topProductsQ.isError}
            onRetry={() => topProductsQ.refetch()}
            emptyTitle="No product sales yet"
            emptyDescription="Your best sellers will show here for the selected filters."
          />
        </InsightCard>

        <InsightCard
          title="Slow moving stock"
          subtitle={`Not sold in 30+ days · ${periodLabel(slowPeriod)}`}
          icon={<AlertCircle className="h-4 w-4 text-orange-600" />}
          filters={
            <AnalyticsCardFilters
              region={slowRegion}
              period={slowPeriod}
              regions={regions}
              regionsLoading={regionsLoading}
              onRegionChange={setSlowRegion}
              onPeriodChange={setSlowPeriod}
            />
          }
        >
          {slowProductsQ.isLoading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>
          ) : slowProductsQ.isError ? (
            <p className="text-sm text-red-600 py-8 text-center">Could not load slow products.</p>
          ) : (slowProductsQ.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">All products are moving well.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Last sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slowProductsQ.data!.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell className="font-medium">{row.productName}</TableCell>
                    <TableCell className="text-right">
                      {(row.currentStock ?? 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right text-orange-700">
                      {formatDateTime(row.lastSoldAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </InsightCard>
      </div>

      <InsightCard
        title="Top retailers"
        subtitle={periodLabel(retailersPeriod)}
        icon={<Users className="h-4 w-4 text-primary" />}
        filters={
          <AnalyticsCardFilters
            region={retailersRegion}
            period={retailersPeriod}
            regions={regions}
            regionsLoading={regionsLoading}
            onRegionChange={setRetailersRegion}
            onPeriodChange={setRetailersPeriod}
          />
        }
      >
        <AnalyticsMetricsLegend
          items={[
            { label: "Bar length", description: "Total revenue from accepted orders in the selected period" },
            { label: "Total orders", description: "Accepted orders counted toward that revenue" },
            { label: "Outstanding due", description: "Current ledger balance owed by the retailer (all time)" },
            { label: "Avg order value", description: "Total revenue ÷ total orders for the period" },
          ]}
        />
        <RankedBarChart
          rows={retailerRows}
          valueLabel="Total revenue"
          barColor={CHART_COLORS.sales}
          isLoading={topRetailersQ.isLoading}
          isError={topRetailersQ.isError}
          onRetry={() => topRetailersQ.refetch()}
          emptyTitle="No retailer sales yet"
          emptyDescription="Top customers appear for the selected region and period."
        />
      </InsightCard>

      <InsightCard
        title="Number of orders"
        subtitle={periodLabel(ordersPeriod)}
        icon={<ClipboardList className="h-4 w-4 text-primary" />}
        filters={
          <AnalyticsCardFilters
            region="all"
            period={ordersPeriod}
            regions={regions}
            regionsLoading={regionsLoading}
            onRegionChange={() => {}}
            onPeriodChange={setOrdersPeriod}
            showRegion={false}
          />
        }
      >
        <p className="text-xs text-gray-500 mb-3">
          Counts every order placed in the selected period (pending, accepted, and in progress). Rejected and
          cancelled orders are excluded. Hover a region bar for its share.
        </p>
        <RegionOrdersBarChart
          data={ordersByRegionQ.data}
          isLoading={ordersByRegionQ.isLoading}
          isError={ordersByRegionQ.isError}
          onRetry={() => ordersByRegionQ.refetch()}
        />
      </InsightCard>
    </div>
  );
}

function AnalyticsMetricsLegend({
  items,
}: {
  items: { label: string; description: string }[];
}) {
  return (
    <div className="mb-3 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5">
      <p className="text-xs font-medium text-gray-700 mb-1.5">What the numbers mean</p>
      <ul className="grid gap-1 sm:grid-cols-2 text-xs text-gray-600">
        {items.map((item) => (
          <li key={item.label}>
            <span className="font-medium text-gray-800">{item.label}:</span> {item.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsightCard({
  title,
  subtitle,
  icon,
  filters,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border-none shadow-sm bg-white">
      <CardHeader className="pb-3 border-b border-gray-100 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 shrink-0">
            {icon}
            <span>
              {title}
              {subtitle ? (
                <span className="block text-xs font-normal text-gray-500 mt-0.5">{subtitle}</span>
              ) : null}
            </span>
          </CardTitle>
          {filters ? (
            <div className="w-full lg:w-auto lg:flex lg:justify-end min-w-0">{filters}</div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3">{children}</CardContent>
    </Card>
  );
}

