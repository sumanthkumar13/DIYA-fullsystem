import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { fetchKhatabookSummary, fetchKhatabookRetailers } from "@/services/khatabook";
import { useKpiWidget } from "@/hooks/useDashboard";
import { KPI_PERIOD_OPTIONS, type KpiTimePeriod } from "@/lib/kpiPeriod";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/money";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type KhatabookItem = {
  id: number | string;
  name: string;
  retailerName: string;
  shopName: string;
  city: string;
  phone: string;
  outstanding: number;
  due: string;
  overdue: string;
  lastPayment: string;
  status: string;
  initials: string;
};

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Case-insensitive match across proprietor name, shop, city, phone (incl. digit-only phone match). */
function khatabookMatchesSearch(item: KhatabookItem, rawQuery: string): boolean {
  const q = normalizeQuery(rawQuery);
  if (!q) return true;

  const haystackParts = [item.retailerName, item.shopName, item.city, item.phone]
    .filter((x) => x.trim().length > 0)
    .map((x) => x.toLowerCase());

  if (haystackParts.some((p) => p.includes(q))) return true;

  const qDigits = digitsOnly(rawQuery);
  if (qDigits.length >= 3 && item.phone) {
    const phoneDigits = digitsOnly(item.phone);
    if (phoneDigits.includes(qDigits)) return true;
  }
  return false;
}

export default function Khatabook() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [collectedPeriod, setCollectedPeriod] = useState<KpiTimePeriod>("TODAY");

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["khatabook-summary"],
    queryFn: fetchKhatabookSummary,
  });

  const { data: retailers, isLoading: retailersLoading } = useQuery({
    queryKey: ["khatabook-retailers"],
    queryFn: fetchKhatabookRetailers,
  });

  const collectedQ = useKpiWidget("PAYMENTS", collectedPeriod, "all");

  const khatabookList = retailers || [];
  const filteredList = useMemo(() => {
    return khatabookList.filter((item: KhatabookItem) => {
      if (filterStatus !== "all") {
        if (filterStatus === "Critical" && item.status !== "Critical") return false;
        if (
          filterStatus === "Pending" &&
          item.status !== "Pending" &&
          item.status !== "Due"
        ) {
          return false;
        }
        if (filterStatus === "Settled" && item.status !== "Settled") return false;
      }
      return khatabookMatchesSearch(item, searchQuery);
    });
  }, [khatabookList, filterStatus, searchQuery]);

  const outstandingTrend = useMemo(() => {
    const today = Number(summary?.totalOutstanding ?? 0);
    const yesterday = Number(summary?.totalOutstandingYesterday ?? 0);
    return computeTrend(today, yesterday);
  }, [summary?.totalOutstanding, summary?.totalOutstandingYesterday]);

  const collectedTrend = useMemo(() => {
    const value = Number(collectedQ.data?.value ?? 0);
    const comparison = Number(collectedQ.data?.comparisonValue ?? 0);
    return computeTrend(value, comparison);
  }, [collectedQ.data?.value, collectedQ.data?.comparisonValue]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Khatabook</h1>
          <p className="text-sm text-gray-500">Track retailer dues and manage collections efficiently.</p>
        </div>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-500 mb-1">Total Outstanding Due</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-display font-bold text-gray-900">
                {summaryLoading ? "Loading..." : formatINR(summary?.totalOutstanding ?? 0)}
              </h3>
              {!summaryLoading && (
                <TrendPill trend={outstandingTrend} />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Across {summaryLoading ? "..." : (summary?.retailerCount ?? 0)} retailers
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-500 mb-1">Critical Overdue</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-display font-bold text-red-600">
                {summaryLoading ? "Loading..." : formatINR(summary?.criticalOverdue ?? 0)}
              </h3>
              {!summaryLoading &&
                Number(summary?.criticalOverdue ?? 0) > 0 && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded animate-pulse">
                    Urgent
                  </span>
                )}
            </div>
            {!summaryLoading && Number(summary?.criticalOverdue ?? 0) > 0 ? (
              <p className="text-xs text-gray-400 mt-1">Needs immediate attention</p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">No critical overdue right now</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-medium text-gray-500">Collected Payment</p>
              <Select value={collectedPeriod} onValueChange={(v) => setCollectedPeriod(v as KpiTimePeriod)}>
                <SelectTrigger
                  aria-label="Collected payment time range"
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
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-display font-bold text-green-600">
                {collectedQ.isLoading ? "Loading..." : formatINR(collectedQ.data?.value ?? 0)}
              </h3>
              {!collectedQ.isLoading && <TrendPill trend={collectedTrend} />}
            </div>
            <p className="text-xs text-gray-400 mt-1">vs prior period</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by name, shop, city, or phone…" 
            className="pl-10 bg-gray-50 border-gray-200 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
          {["all", "Critical", "Pending", "Settled"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filterStatus === status
                  ? "bg-primary text-white shadow-md shadow-orange-200"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {status === "all"
                ? "All Dues"
                : status === "Pending"
                  ? "Due / Pending"
                  : status}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {retailersLoading ? (
          <p className="text-sm text-gray-500 py-6">Loading retailers...</p>
        ) : filteredList.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            {khatabookList.length === 0
              ? "No retailers in your Khatabook yet."
              : "No retailers match your search or filters."}
          </p>
        ) : (
        filteredList.map((item: KhatabookItem) => (
          <Link key={item.id} href={`/khatabook/${item.id}`}>
            <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/30 cursor-pointer bg-white border-gray-200">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex items-center gap-4 flex-1">
                <Avatar className="h-12 w-12 border border-gray-100">
                  <AvatarFallback
                    className={cn(
                      "font-bold",
                      item.status === "Critical" && "bg-red-50 text-red-600",
                      item.status === "Pending" && "bg-amber-50 text-amber-800",
                      item.status === "Due" && "bg-orange-50 text-orange-700",
                      item.status === "Settled" && "bg-gray-100 text-gray-600",
                    )}
                  >
                    {item.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg truncate">{item.name}</h3>
                  {item.city ? (
                    <p className="text-xs text-gray-500 truncate">{item.city}</p>
                  ) : null}
                  <p className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-700">{item.status}</span>
                    <span className="text-gray-300">·</span>
                    <span>Last paid: {item.lastPayment}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:items-center gap-6 sm:gap-10 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Due</p>
                  <p className="font-bold text-gray-900 text-lg">{item.due}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Overdue</p>
                  <p className={`font-bold text-lg ${item.status === 'Critical' ? 'text-red-600' : 'text-gray-400'}`}>
                    {item.overdue}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                <Button 
                  size="sm" 
                  className={`${
                    item.status === 'Settled' 
                      ? 'bg-gray-100 text-gray-400 hover:bg-gray-200' 
                      : 'bg-primary hover:bg-primary/90 text-white shadow-sm'
                  }`}
                  disabled={item.status === 'Settled'}
                >
                  {item.status === 'Settled' ? 'Settled' : 'Request Payment'}
                </Button>
              </div>
            </CardContent>
          </Card>
          </Link>
        ))
        )}
      </div>
    </div>
  );
}

type TrendStatus = "up" | "down" | "neutral";
type Trend = { status: TrendStatus; label: string };

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

function TrendPill({ trend }: { trend: Trend }) {
  const cls =
    trend.status === "neutral"
      ? "text-gray-600 bg-gray-50"
      : trend.status === "up"
        ? "text-green-600 bg-green-50"
        : "text-red-600 bg-red-50";

  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${cls}`}>
      {trend.label}
    </span>
  );
}
