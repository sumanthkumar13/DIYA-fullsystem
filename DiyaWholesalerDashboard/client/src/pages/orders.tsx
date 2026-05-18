import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import { 
  Search, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  XCircle
} from "lucide-react";
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
import emptyStateImage from "@assets/generated_images/empty_state_illustration_for_orders.png";
import { fetchOrders, OrderListItem } from "@/services/order";
import { CreateOrderModal } from "@/components/orders/CreateOrderModal";
import { formatINR } from "@/lib/money";
import { useRetailerRegions } from "@/hooks/useRetailerRegions";
import {
  normalizeWholesalerOrderListItem,
  wholesalerOrderUiStatusPillClass,
} from "@/lib/wholesalerOrderStatus";

// Map backend status to filter value
function mapStatusToFilter(uiStatus: string): string {
  const filterMap: Record<string, string> = {
    "Pending": "PLACED",
    "Approved": "ACCEPTED",
    "Packed": "PACKING",
    "Out for Delivery": "DISPATCHED",
    "Delivered": "DELIVERED",
    "Cancelled": "CANCELLED",
    "Rejected": "REJECTED",
  };
  return filterMap[uiStatus] || uiStatus;
}

// Format amount with ₹ and commas
function formatAmount(amount: number): string {
  return formatINR(amount);
}

export default function Orders() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const { data: regions = [], isLoading: regionsLoading } = useRetailerRegions();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("all");
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const pageSize = 20;

  /** Last successfully loaded page index (0-based). Used so "load more" never uses a stale page from closures. */
  const lastLoadedPageRef = useRef(-1);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const appendNewCountRef = useRef(0);

  const loadOrders = useCallback(
    async (opts: { reset: boolean; pageOverride?: number }) => {
      try {
        if (opts.reset) {
          loadingRef.current = true;
          setLoading(true);
          setOrders([]);
          lastLoadedPageRef.current = -1;
        } else {
          if (loadingMoreRef.current) return;
          loadingMoreRef.current = true;
          setLoadingMore(true);
        }
        if (opts.reset) {
          setError(null);
        }

        const backendStatus = filterStatus === "all" ? undefined : mapStatusToFilter(filterStatus);
        const regionParam = filterRegion !== "all" ? filterRegion : undefined;

        const nextPage = opts.reset
          ? (opts.pageOverride ?? 0)
          : (opts.pageOverride !== undefined ? opts.pageOverride : lastLoadedPageRef.current + 1);

        const data = await fetchOrders(
          backendStatus,
          searchQuery || undefined,
          dateRange === "all" ? undefined : dateRange,
          regionParam,
          undefined,
          nextPage,
          pageSize
        );

        const raw = Array.isArray(data) ? data : [];

        const transformedOrders: OrderListItem[] = raw.map((order: any) =>
          normalizeWholesalerOrderListItem(order as Record<string, unknown>)
        );

        setOrders((prev) => {
          if (opts.reset) {
            appendNewCountRef.current = transformedOrders.length;
            return transformedOrders;
          }
          const seen = new Set(prev.map((o) => o.id).filter(Boolean));
          let newItems = 0;
          const merged = [...prev];
          for (const o of transformedOrders) {
            if (o.id && !seen.has(o.id)) {
              seen.add(o.id);
              merged.push(o);
              newItems++;
            }
          }
          appendNewCountRef.current = newItems;
          return merged;
        });

        const newItems = appendNewCountRef.current;
        const batchFull = raw.length === pageSize;
        // Stop if server returned a full batch but nothing new (duplicate page / stuck cursor)
        if (!opts.reset && batchFull && newItems === 0) {
          setHasMore(false);
        } else {
          setHasMore(batchFull);
        }
        lastLoadedPageRef.current = nextPage;
      } catch (e: any) {
        console.error("Failed to load orders:", e);
        setError(e?.response?.data?.message || e?.message || "Failed to load orders");
        if (opts.reset) {
          setOrders([]);
          setHasMore(false);
          lastLoadedPageRef.current = -1;
        }
      } finally {
        loadingRef.current = false;
        loadingMoreRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filterStatus, searchQuery, dateRange, filterRegion, pageSize]
  );

  // Reset paging when filters change; fetch first page only (server-side filters + slice).
  useEffect(() => {
    setHasMore(false);
    void loadOrders({ reset: true, pageOverride: 0 });
  }, [filterStatus, searchQuery, dateRange, filterRegion, loadOrders]);

  useEffect(() => {
    if (
      filterRegion !== "all" &&
      !regionsLoading &&
      regions.length > 0 &&
      !regions.includes(filterRegion)
    ) {
      setFilterRegion("all");
    }
  }, [filterRegion, regions, regionsLoading]);

  // Infinite scroll: load next page when sentinel is near viewport
  useEffect(() => {
    const node = loadMoreSentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (!hit) return;
        if (loadingRef.current || loadingMoreRef.current) return;
        void loadOrders({ reset: false });
      },
      { root: null, rootMargin: "160px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadOrders, orders.length]);

  const getStatusColor = (status: string) => wholesalerOrderUiStatusPillClass(status);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending": return Clock;
      case "Approved": return CheckCircle2;
      case "Packed": return Package;
      case "Out for Delivery": return Truck;
      case "Delivered": return CheckCircle2;
      case "Cancelled":
      case "Rejected":
        return XCircle;
      default: return AlertTriangle;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">Manage and track all your wholesale orders.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm"
            onClick={() => setCreateOrderOpen(true)}
          >
            <Package className="h-4 w-4" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by retailer or Order Number..." 
            className="pl-10 bg-gray-50 border-gray-200 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
           <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] bg-gray-50 border-gray-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Packed">Packed</SelectItem>
              <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl shadow-sm border border-gray-100 max-w-full">
            <MapPinIcon className="h-4 w-4 text-primary shrink-0 ml-1" />
            <Select value={filterRegion} onValueChange={setFilterRegion} disabled={regionsLoading}>
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

          <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <SelectTrigger className="w-[150px] bg-gray-50 border-gray-200">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders list: tight, even vertical spacing between cards */}
      <div className="flex flex-col gap-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-500">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Error loading orders</h3>
            <p className="text-gray-500 text-sm mt-1">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => void loadOrders({ reset: true, pageOverride: 0 })}>
              Retry
            </Button>
          </div>
        ) : orders.length > 0 ? (
          orders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            const displayOrderNumber = order.orderNumber || "—";
            const dueDate = order.dueDate ? new Date(order.dueDate) : null;
            const unpaid = Number(order.unpaidAmount ?? 0);
            const isInactive =
              order.status === "Cancelled" ||
              order.status === "Rejected" ||
              order.status === "Pending";
            const isOverdue =
              !!dueDate &&
              !Number.isNaN(dueDate.getTime()) &&
              new Date().getTime() > dueDate.getTime() &&
              unpaid > 0 &&
              !isInactive;
            return (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/30 cursor-pointer group border-gray-200 bg-white">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_7.5rem_minmax(10.5rem,1fr)] lg:items-center lg:gap-x-5">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-xs group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          {displayOrderNumber.slice(-4)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900">{displayOrderNumber}</p>
                          <p className="text-xs text-gray-500">{order.date || ""}</p>
                          <p className="font-semibold text-gray-900 truncate mt-2 sm:mt-1 lg:mt-2">{order.retailer}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                            <MapPinIcon className="h-3 w-3 shrink-0" /> {order.location}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center text-left sm:text-right lg:text-right shrink-0 lg:w-[7.5rem] lg:justify-self-end">
                        <p className="font-bold text-gray-900 tabular-nums tracking-tight">{formatAmount(order.amount || 0)}</p>
                        <p className="text-xs text-gray-500 tabular-nums">{order.items || 0} Items</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:min-h-[2.25rem] content-center">
                        {isOverdue && (
                          <div className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-full whitespace-nowrap">
                            OVERDUE
                          </div>
                        )}
                        {(order.exposure === "CRITICAL" || order.exposure === "Critical") && (
                          <div className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100 whitespace-nowrap">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Credit Risk
                          </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusColor(order.status)}`}>
                          <StatusIcon className="h-3 w-3 shrink-0" />
                          {order.status}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
            <img src={emptyStateImage} alt="No orders found" className="h-48 w-auto mb-4 opacity-80" />
            <h3 className="text-lg font-semibold text-gray-900">No orders found</h3>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search query.</p>
          </div>
        )}
        {/* Sentinel for infinite scroll (only observed when hasMore) */}
        {!loading && !error && hasMore && <div ref={loadMoreSentinelRef} className="h-px w-full shrink-0" aria-hidden />}
      </div>

      {!loading && !error && hasMore && (
        <div className="flex justify-center pt-3">
          <Button
            type="button"
            variant="ghost"
            className="text-gray-500 hover:text-gray-900"
            disabled={loadingMore}
            onClick={() => void loadOrders({ reset: false })}
          >
            {loadingMore ? "Loading…" : "Load More Orders"}
          </Button>
        </div>
      )}
      <CreateOrderModal
        open={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
        onCreated={() => void loadOrders({ reset: true, pageOverride: 0 })}
      />
    </div>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
