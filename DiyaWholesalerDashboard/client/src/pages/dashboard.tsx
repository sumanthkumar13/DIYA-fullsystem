import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useWholesalerVisibility } from "@/hooks/useWholesalerVisibility";
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
  Loader2
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
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/money";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useDashboardKpi,
  useDashboardActivity,
  useTerritoryPerformance,
} from "@/hooks/useDashboard";
import { useRetailerRegions } from "@/hooks/useRetailerRegions";
import type { TerritoryPerformanceRow } from "@/services/analytics";
import { useAuth } from "@/context/AuthContext";
import { getGreeting, getUserDisplayName } from "@/lib/greeting";

export default function Dashboard() {
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [addRetailerOpen, setAddRetailerOpen] = useState(false);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [kpiRegion, setKpiRegion] = useState<string>("all");
  const { data: kpi } = useDashboardKpi(kpiRegion);
  const { data: regions = [], isLoading: regionsLoading } = useRetailerRegions();
  const [territorySort, setTerritorySort] = useState<"revenue" | "risk">("revenue");
  const { data: territoryRows, isLoading: territoryLoading, isError: territoryError } =
    useTerritoryPerformance(territorySort);
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
  const { toast } = useToast();
  const { mode, loading: visibilityLoading, saving, setVisibility } = useWholesalerVisibility();
  const { user } = useAuth();

  const greeting = getGreeting();
  const userName = getUserDisplayName(user);

  const newOrdersTrend = useMemo(
    () => computeTrend(kpi?.newOrdersToday ?? 0, kpi?.newOrdersYesterday ?? 0),
    [kpi?.newOrdersToday, kpi?.newOrdersYesterday],
  );

  const paymentsTrend = useMemo(
    () =>
      computeTrend(
        Number(kpi?.paymentsReceivedToday ?? 0),
        Number(kpi?.paymentsReceivedYesterday ?? 0),
      ),
    [kpi?.paymentsReceivedToday, kpi?.paymentsReceivedYesterday],
  );

  const pendingTrend = useMemo(
    () => computeTrend(kpi?.pendingOrders ?? 0, kpi?.pendingOrdersYesterday ?? 0),
    [kpi?.pendingOrders, kpi?.pendingOrdersYesterday],
  );

  const outstandingTrend = useMemo(
    () =>
      computeTrend(
        Number(kpi?.totalOutstanding ?? 0),
        Number(kpi?.totalOutstandingYesterday ?? 0),
      ),
    [kpi?.totalOutstanding, kpi?.totalOutstandingYesterday],
  );

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
          title="New Orders Today"
          value={kpi?.newOrdersToday ?? 0}
          trend={newOrdersTrend}
          icon={Package}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <KpiCard
          title="Payments Received"
          value={formatINR(kpi?.paymentsReceivedToday ?? 0)}
          trend={paymentsTrend}
          icon={CheckCircle2}
          color="text-green-600"
          bg="bg-green-50"
        />
        <KpiCard
          title="Pending Orders"
          value={kpi?.pendingOrders ?? 0}
          trend={pendingTrend}
          icon={Clock}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <KpiCard
          title="Total Outstanding"
          value={formatINR(kpi?.totalOutstanding ?? 0)}
          trend={outstandingTrend}
          icon={AlertCircle}
          color="text-red-600"
          bg="bg-red-50"
          isNegative={true}
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
              <div className="px-6 pt-4 pb-3 shrink-0 border-b border-gray-50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-gray-500">
                    Regions where you have retailers (not affected by the KPI filter above).
                  </p>
                  <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 w-full sm:w-auto shrink-0">
                    <Button
                      type="button"
                      variant={territorySort === "revenue" ? "secondary" : "ghost"}
                      size="sm"
                      className="flex-1 sm:flex-none h-8 text-xs"
                      onClick={() => setTerritorySort("revenue")}
                    >
                      By revenue
                    </Button>
                    <Button
                      type="button"
                      variant={territorySort === "risk" ? "secondary" : "ghost"}
                      size="sm"
                      className="flex-1 sm:flex-none h-8 text-xs"
                      onClick={() => setTerritorySort("risk")}
                    >
                      By risk
                    </Button>
                  </div>
                </div>
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
          <Card className="border-none shadow-sm bg-white">
  <CardHeader className="pb-2">
    <CardTitle className="text-base font-semibold flex items-center justify-between">
      Retailer Access
      <Badge variant={mode === "PUBLIC" ? "secondary" : "destructive"}>
        {mode}
      </Badge>
    </CardTitle>
  </CardHeader>

  <CardContent className="space-y-3">
    <p className="text-sm text-gray-500">
      Control who can connect to your business.
    </p>

    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
      <div>
        <p className="font-medium text-gray-900">Private Mode</p>
        <p className="text-xs text-gray-500">
          Retailers must request approval before ordering.
        </p>
      </div>

      <Switch
        checked={mode === "PRIVATE"}
        disabled={visibilityLoading || saving}
        onCheckedChange={async (checked) => {
          const newMode = checked ? "PRIVATE" : "PUBLIC";
          try {
            await setVisibility(newMode);
            toast({
              title: "Updated",
              description: `Visibility changed to ${newMode}`,
            });
          } catch (e: any) {
            toast({
              title: "Failed",
              description: e?.response?.data?.message || "Could not update visibility mode",
              variant: "destructive",
            });
          }
        }}
      />
    </div>

    <div className="text-xs text-gray-400">
      {mode === "PUBLIC"
        ? "Public: connection requests auto-approved."
        : "Private: you must approve connection requests."}
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
      <AddRetailerModal open={addRetailerOpen} onClose={() => setAddRetailerOpen(false)} />
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
            <span className="text-gray-500">Active retailers</span>
            <span className="font-medium text-gray-900">
              {row.activeRetailers} / {row.totalRetailers}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type TrendStatus = "up" | "down" | "neutral";
type Trend = { status: TrendStatus; label: string };

function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
  color,
  bg,
  isNegative,
}: {
  title: string;
  value: ReactNode;
  trend: Trend;
  icon: any;
  color: string;
  bg: string;
  isNegative?: boolean;
}) {
  const isGood =
    trend.status === "neutral"
      ? null
      : isNegative
        ? trend.status === "down"
        : trend.status === "up";

  const pillClass =
    trend.status === "neutral"
      ? "bg-gray-100 text-gray-700"
      : isGood
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-700";

  const TrendIcon =
    trend.status === "neutral" ? null : (
      <TrendingUp className={cn("h-3 w-3", trend.status === "down" && "rotate-180")} />
    );

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer group bg-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 font-display">{value}</h3>
          </div>
          <div className={cn("p-2 rounded-lg transition-colors", bg)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5",
              pillClass,
            )}
          >
            {TrendIcon}
            {trend.label}
          </span>
          <span className="text-xs text-gray-400">vs yesterday</span>
        </div>
      </CardContent>
    </Card>
  );
}

function computeTrend(today: number, yesterday: number): Trend {
  const t = Number.isFinite(today) ? today : 0;
  const y = Number.isFinite(yesterday) ? yesterday : 0;

  if (y === 0) {
    if (t === 0) return { status: "neutral", label: "0%" };
    return { status: "neutral", label: "No previous data" };
  }

  const pct = ((t - y) / y) * 100;
  if (!Number.isFinite(pct)) return { status: "neutral", label: "—" };

  const rounded = Math.round(pct);
  if (rounded === 0) return { status: "neutral", label: "0%" };
  if (rounded > 0) return { status: "up", label: `+${rounded}%` };
  return { status: "down", label: `${rounded}%` };
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
