import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useWholesalerVisibility } from "@/hooks/useWholesalerVisibility";

import {
  ArrowUpRight,
  Clock,
  CreditCard,
  Package,
  AlertCircle,
  CheckCircle2,
  Plus,
  MapPin,
  ChevronDown,
  TrendingUp,
  Users
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
import { useDashboardKpi, useDashboardTerritory, useDashboardActivity } from "@/hooks/useDashboard";

export default function Dashboard() {
  const { data: kpi } = useDashboardKpi();
  const { data: territory } = useDashboardTerritory();
  const { data: activity } = useDashboardActivity();
  const { toast } = useToast();
const { mode, loading: visibilityLoading, saving, setVisibility } = useWholesalerVisibility();

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-bold text-gray-900">Good Morning, Vijay ☀️</h1>
          <p className="text-sm text-gray-500">Here's what's happening in your business today.</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
          <MapPin className="h-4 w-4 text-primary ml-2" />
          <Select defaultValue="all">
            <SelectTrigger className="w-[140px] border-0 bg-transparent focus:ring-0 font-medium text-gray-700 shadow-none h-8">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="telangana">Telangana</SelectItem>
              <SelectItem value="andhra">Andhra Pradesh</SelectItem>
            </SelectContent>
          </Select>
          <div className="h-4 w-px bg-gray-200" />
          <Select defaultValue="hyd">
            <SelectTrigger className="w-[140px] border-0 bg-transparent focus:ring-0 font-medium text-gray-700 shadow-none h-8">
              <SelectValue placeholder="Select District" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hyd">Hyderabad</SelectItem>
              <SelectItem value="rangareddy">Ranga Reddy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="New Orders Today"
          value={kpi?.newOrdersToday ?? 0}
          trend="+12%"
          icon={Package}
          color="text-blue-600"
          bg="bg-blue-50"
          trendUp={true}
        />
        <KpiCard
          title="Payments Received"
          value={`₹${kpi?.paymentsReceivedToday ?? 0}`}
          trend="+8%"
          icon={CheckCircle2}
          color="text-green-600"
          bg="bg-green-50"
          trendUp={true}
        />
        <KpiCard
          title="Pending Orders"
          value={kpi?.pendingOrders ?? 0}
          trend="-2"
          icon={Clock}
          color="text-orange-600"
          bg="bg-orange-50"
          trendUp={false}
        />
        <KpiCard
          title="Total Outstanding"
          value={`₹${kpi?.totalOutstanding ?? 0}`}
          trend="+5%"
          icon={AlertCircle}
          color="text-red-600"
          bg="bg-red-50"
          trendUp={true}
          isNegative={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left (2 cols) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Territory Heatmap Placeholder */}
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-gray-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Territory Performance
                </CardTitle>
                <div className="flex gap-2 text-xs font-medium">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500"></span> Gold</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500"></span> Silver</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500"></span> Risk</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-64 w-full bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                <MapPin className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">Interactive Territory Map Visualization</p>
                <p className="text-xs opacity-60">(Shows revenue heat & risk zones)</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Top Performing Area</p>
                  <p className="font-semibold text-gray-900">{territory?.topArea?.name}</p>
                  <p className="text-green-600 font-medium text-sm mt-1">₹{territory?.topArea?.value}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Highest Risk Area</p>
                  <p className="font-semibold text-gray-900">{territory?.highestRiskArea?.name}</p>
                  <p className="text-red-600 font-medium text-sm mt-1">₹{territory?.highestRiskArea?.value}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Active Retailers</p>
                  <p className="font-semibold text-gray-900">{territory?.activeRetailers} / {territory?.totalRetailers}</p>
                  <p className="text-xs text-blue-600 mt-1">78% Active</p>
                </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button className="h-auto py-4 flex flex-col gap-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-900 hover:border-primary/50 transition-all group" variant="ghost">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <span className="font-medium">Add Payment</span>
            </Button>
            <Button className="h-auto py-4 flex flex-col gap-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-900 hover:border-primary/50 transition-all group" variant="ghost">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <span className="font-medium">Create Order</span>
            </Button>
            <Button className="h-auto py-4 flex flex-col gap-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-900 hover:border-primary/50 transition-all group" variant="ghost">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <span className="font-medium">Add Retailer</span>
            </Button>
            <Button className="h-auto py-4 flex flex-col gap-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-900 hover:border-primary/50 transition-all group" variant="ghost">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowUpRight className="h-5 w-5 text-purple-600" />
              </div>
              <span className="font-medium">View Reports</span>
            </Button>
          </div>
        </div>

        {/* Right Sidebar - Activity Stream */}
        <div className="lg:col-span-1">
          <Card className="h-full border-none shadow-sm bg-white">
            <CardHeader className="border-b border-gray-100 pb-3 sticky top-0 bg-white z-10">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                Live Activity
                <Badge variant="secondary" className="text-xs font-normal">Today</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
              </div>
              <div className="p-4 text-center">
                <Button variant="link" size="sm" className="text-primary">View All Activity</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, icon: Icon, color, bg, trendUp, isNegative }: any) {
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
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5",
            trendUp
              ? (isNegative ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")
              : (isNegative ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
          )}>
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
            {trend}
          </span>
          <span className="text-xs text-gray-400">vs yesterday</span>
        </div>
      </CardContent>
    </Card>
  );
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
