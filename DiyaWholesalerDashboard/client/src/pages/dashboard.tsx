import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { AddPaymentModal } from "@/components/payments/AddPaymentModal";
import { AddRetailerModal } from "@/components/retailers/AddRetailerModal";
import { CreateOrderModal } from "@/components/orders/CreateOrderModal";

import {
  Clock,
  CreditCard,
  Package,
  AlertCircle,
  CheckCircle2,
  MapPin,
  TrendingUp,
  Users,
  Loader2,
  ReceiptIndianRupee,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/money";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useKpiWidget,
  useDashboardActivity,
  useTerritoryPerformance,
} from "@/hooks/useDashboard";
import { useRetailerRegions } from "@/hooks/useRetailerRegions";
import type { TerritoryPerformanceRow } from "@/services/analytics";
import { useAuth } from "@/context/AuthContext";
import { getGreeting, getUserDisplayName } from "@/lib/greeting";
import { KPI_PERIOD_OPTIONS, buildSalesHref, type KpiTimePeriod } from "@/lib/kpiPeriod";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [addRetailerOpen, setAddRetailerOpen] = useState(false);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [kpiRegion, setKpiRegion] = useState<string>("all");
  const [pNewOrders, setPNewOrders] = useState<KpiTimePeriod>("TODAY");
  const [pPayments, setPPayments] = useState<KpiTimePeriod>("TODAY");
  const [pPending, setPPending] = useState<KpiTimePeriod>("TODAY");
  const [pSales, setPSales] = useState<KpiTimePeriod>("TODAY");

  const newOrdersQ = useKpiWidget("NEW_ORDERS", pNewOrders, kpiRegion);
  const paymentsQ = useKpiWidget("PAYMENTS", pPayments, kpiRegion);
  const pendingQ = useKpiWidget("PENDING_ORDERS", pPending, kpiRegion);
  const salesQ = useKpiWidget("SALES", pSales, kpiRegion);
  const { data: regions = [], isLoading: regionsLoading } = useRetailerRegions();
  const { data: territoryRows, isLoading: territoryLoading, isError: territoryError } =
    useTerritoryPerformance();
  const { data: activity } = useDashboardActivity();

  const visibleTerritoryRows = useMemo(() => {
    if (!territoryRows?.length) return [];
    if (!regions.length) return [];
    const allowed = new Set(regions);
    return territoryRows.filter((r) => allowed.has(r.region));
  }, [territoryRows, regions]);

  useEffect(() => {
    if (
      kpiRegion !== "all" &&
      !regionsLoading &&
      regions.length > 0 &&
      !regions.includes(kpiRegion)
    ) {
      setKpiRegion("all");
    }
  }, [kpiRegion, regions, regionsLoading]);
  const { user } = useAuth();

  const greeting = getGreeting();
  const userName = getUserDisplayName(user);

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-bold text-gray-900">
            {userName ? `${greeting}, ${userName}` : greeting}
          </h1>
          <p className="text-sm text-gray-500">Here's what's happening in your business today.</p>
        </div>

        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl shadow-sm border border-gray-100 max-w-full">
          <MapPin className="h-4 w-4 text-primary shrink-0 ml-1" aria-hidden />
          <Select value={kpiRegion} onValueChange={setKpiRegion} disabled={regionsLoading}>
            <SelectTrigger className="min-w-[10rem] max-w-[220px] border-0 bg-transparent focus:ring-0 font-medium text-gray-700 shadow-none h-9">
              <SelectValue placeholder={regionsLoading ? "Loading regions…" : "Region filter"} />
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

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="New orders"
          value={
            newOrdersQ.isLoading ? "—" : Math.round(Number(newOrdersQ.data?.value ?? 0)).toLocaleString("en-IN")
          }
          icon={Package}
          color="text-blue-600"
          bg="bg-blue-50"
          period={pNewOrders}
          onPeriodChange={setPNewOrders}
          isWidgetLoading={newOrdersQ.isFetching}
        />
        <KpiCard
          title="Payments"
          value={paymentsQ.isLoading ? "—" : formatINR(paymentsQ.data?.value ?? 0)}
          icon={CheckCircle2}
          color="text-green-600"
          bg="bg-green-50"
          period={pPayments}
          onPeriodChange={setPPayments}
          isWidgetLoading={paymentsQ.isFetching}
        />
        <KpiCard
          title="Pending"
          value={
            pendingQ.isLoading ? "—" : Math.round(Number(pendingQ.data?.value ?? 0)).toLocaleString("en-IN")
          }
          icon={Clock}
          color="text-orange-600"
          bg="bg-orange-50"
          period={pPending}
          onPeriodChange={setPPending}
          isWidgetLoading={pendingQ.isFetching}
        />
        <KpiCard
          title="Sales"
          value={salesQ.isLoading ? "—" : formatINR(salesQ.data?.value ?? 0)}
          icon={ReceiptIndianRupee}
          color="text-emerald-600"
          bg="bg-emerald-50"
          href={buildSalesHref(kpiRegion, pSales)}
          period={pSales}
          onPeriodChange={setPSales}
          isWidgetLoading={salesQ.isFetching}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left (2 cols) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Territory Heatmap Placeholder */}
          <Card className="border-none shadow-sm bg-white overflow-hidden flex flex-col max-h-[min(28rem,65vh)]">
            <CardHeader className="border-b border-gray-100 pb-3 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                  Territory Performance
                </CardTitle>
                <div className="flex gap-3 text-xs font-medium text-gray-600 shrink-0">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" /> Gold
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" /> Silver
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col min-h-0 flex-1">
              <div className="px-6 pt-4 pb-3 shrink-0 border-b border-gray-50">
                <p className="text-sm text-gray-500">
                  Regions where you have retailers (not affected by the KPI filter above). Sorted by revenue.
                </p>
              </div>
              <div className="px-6 py-4 overflow-y-auto min-h-0 flex-1 overscroll-contain">
                {territoryLoading && (
                  <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading territory data…</span>
                  </div>
                )}
                {territoryError && !territoryLoading && (
                  <p className="text-sm text-red-600 text-center py-8">
                    Could not load territory performance. Please refresh or try again.
                  </p>
                )}
                {!territoryLoading && !territoryError && regionsLoading && (
                  <div className="flex items-center justify-center py-12 text-gray-500 gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading regions…
                  </div>
                )}
                {!territoryLoading &&
                  !territoryError &&
                  !regionsLoading &&
                  regions.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-12">
                      Add retailers with a region to see territory cards here.
                    </p>
                  )}
                {!territoryLoading &&
                  !territoryError &&
                  !regionsLoading &&
                  regions.length > 0 &&
                  visibleTerritoryRows.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-12">
                      No territory metrics for your regions yet.
                    </p>
                  )}
                {!territoryLoading && !territoryError && !regionsLoading && visibleTerritoryRows.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {visibleTerritoryRows.map((row) => (
                      <TerritoryRegionCard key={row.region} row={row} />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>


          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              onClick={() => setAddPaymentOpen(true)}
              className="h-auto py-4 flex flex-col gap-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-900 hover:border-primary/50 transition-all group"
              variant="ghost"
            >
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <span className="font-medium">Add Payment</span>
            </Button>
            <Button
              className="h-auto py-4 flex flex-col gap-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-900 hover:border-primary/50 transition-all group"
              variant="ghost"
              onClick={() => setCreateOrderOpen(true)}
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <span className="font-medium">Create Order</span>
            </Button>
            <Button
              onClick={() => setAddRetailerOpen(true)}
              className="h-auto py-4 flex flex-col gap-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-900 hover:border-primary/50 transition-all group"
              variant="ghost"
            >
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <span className="font-medium">Add Retailer</span>
            </Button>
          </div>
        </div>

        {/* Right Sidebar - Activity Stream */}
        <div className="lg:col-span-1">
          <Card className="border-none shadow-sm bg-white flex flex-col max-h-[min(28rem,65vh)]">
            <CardHeader className="border-b border-gray-100 pb-3 sticky top-0 bg-white z-10">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                Live Activity
                <Badge variant="secondary" className="text-xs font-normal">Today</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1 min-h-0">
                <div className="divide-y divide-gray-50">
                  {activity?.map((item: any, index: number) => (
                    <ActivityItem
                      key={index}
                      title={item.title}
                      subtitle={item.subtitle}
                      time={item.timeAgo}
                      icon={resolveIcon(item.type)}
                      iconBg={resolveColor(item.type)}
                    />
                  ))}
                  {!activity?.length && (
                    <div className="p-6 text-center text-sm text-gray-500">
                      No activity yet.
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 text-center border-t border-gray-100">
                <Button asChild variant="link" size="sm" className="text-primary">
                  <Link href="/activity">View All Activity</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddPaymentModal open={addPaymentOpen} onClose={() => setAddPaymentOpen(false)} />
      <CreateOrderModal open={createOrderOpen} onClose={() => setCreateOrderOpen(false)} />
      <AddRetailerModal
        open={addRetailerOpen}
        onClose={() => setAddRetailerOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-kpi"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-kpi-widget"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-territory"] });
        }}
      />
    </div>
  );
}

function formatTerritoryRupee(n: number) {
  return formatINR(n);
}

function TerritoryRegionCard({ row }: { row: TerritoryPerformanceRow }) {
  const border =
    row.status === "GOLD"
      ? "border-l-emerald-500"
      : row.status === "RISK"
        ? "border-l-red-500"
        : "border-l-amber-400";
  const badgeClass =
    row.status === "GOLD"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : row.status === "RISK"
        ? "bg-red-50 text-red-800 border-red-200"
        : "bg-amber-50 text-amber-900 border-amber-200";

  return (
    <Card className={cn("border border-gray-100 shadow-sm border-l-4 bg-white", border)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-gray-900 leading-tight">{row.region}</h3>
          <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide shrink-0", badgeClass)}>
            {row.status}
          </Badge>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Revenue</span>
            <span className="font-semibold text-gray-900">{formatTerritoryRupee(row.revenue)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Outstanding</span>
            <span className="font-semibold text-orange-700">{formatTerritoryRupee(row.outstanding)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Overdue</span>
            <span className="font-semibold text-red-600">{formatTerritoryRupee(row.overdue)}</span>
          </div>
          <div className="flex justify-between gap-2 pt-1 border-t border-gray-100">
            <span className="text-gray-500 inline-flex items-center gap-1">
              Active retailers
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex rounded-full p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label="How active retailers are counted"
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-[240px] bg-gray-900 text-white border-0 text-xs leading-snug"
                  >
                    Retailers who placed at least one order in the last 7 days are considered active.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
            <span className="font-medium text-gray-900">
              {row.activeRetailers} / {row.totalRetailers}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
  href,
  period,
  onPeriodChange,
  isWidgetLoading,
}: {
  title: string;
  value: ReactNode;
  icon: any;
  color: string;
  bg: string;
  href?: string;
  period?: KpiTimePeriod;
  onPeriodChange?: (p: KpiTimePeriod) => void;
  isWidgetLoading?: boolean;
}) {
  const [, setLocation] = useLocation();

  const handleCardNavigate = () => {
    if (href) setLocation(href);
  };

  const card = (
    <Card
      className={cn(
        "border-none shadow-sm hover:shadow-md transition-all duration-200 group bg-white",
        href && "cursor-pointer hover:-translate-y-1",
        isWidgetLoading && "opacity-80",
      )}
      onClick={href ? handleCardNavigate : undefined}
      tabIndex={href ? 0 : undefined}
      role={href ? "link" : undefined}
      aria-label={href ? `Open sales details` : undefined}
      onKeyDown={
        href
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleCardNavigate();
              }
            }
          : undefined
      }
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-sm font-medium text-gray-500 leading-snug min-w-0 flex-1">{title}</p>
          {period != null && onPeriodChange != null ? (
            <div
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Select value={period} onValueChange={(v) => onPeriodChange(v as KpiTimePeriod)}>
                <SelectTrigger
                  aria-label={`${title} time range`}
                  className="h-7 w-[118px] text-xs border-gray-200/90 bg-white shadow-sm px-2 py-0 gap-1"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end" className="min-w-[9rem]">
                  {KPI_PERIOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-2xl font-bold text-gray-900 font-display tabular-nums tracking-tight">{value}</h3>
          </div>
          <div className={cn("p-2 rounded-lg transition-colors shrink-0", bg)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return card;
}

function ActivityItem({ title, subtitle, time, icon: Icon, iconBg }: any) {
  return (
    <div className="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors cursor-pointer">
      <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">{time}</span>
    </div>
  );
}

function resolveIcon(type: string) {
  switch (type) {
    case "ORDER": return Package;
    case "PAYMENT": return CheckCircle2;
    case "OVERDUE": return AlertCircle;
    case "RETAILER": return Users;
    default: return Clock;
  }
}

function resolveColor(type: string) {
  switch (type) {
    case "ORDER": return "bg-blue-100 text-blue-600";
    case "PAYMENT": return "bg-green-100 text-green-600";
    case "OVERDUE": return "bg-red-100 text-red-600";
    case "RETAILER": return "bg-purple-100 text-purple-600";
    default: return "bg-gray-100 text-gray-600";
  }
}
