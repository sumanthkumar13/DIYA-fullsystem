import { useState, useEffect } from "react";
import { Link } from "wouter";
import { 
  Search, 
  ChevronDown, 
  MoreHorizontal, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  XCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// Map backend status to UI status
function mapStatusToUI(status: string): string {
  const statusMap: Record<string, string> = {
    PLACED: "Pending",
    ACCEPTED: "Approved",
    PACKING: "Packed",
    DISPATCHED: "Out for Delivery",
    DELIVERED: "Delivered",
    COMPLETED: "Delivered",
    CANCELLED: "Cancelled",
    REJECTED: "Rejected",
  };
  return statusMap[status] || status;
}

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

// Format date to relative format
function formatDate(dateString: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) {
      const hours = date.getHours();
      const mins = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12;
      return `Today, ${hour12}:${mins.toString().padStart(2, "0")} ${ampm}`;
    }
    if (diffDays === 1) {
      const hours = date.getHours();
      const mins = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12;
      return `Yesterday, ${hour12}:${mins.toString().padStart(2, "0")} ${ampm}`;
    }
    if (diffDays < 7) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayName = days[date.getDay()];
      const hours = date.getHours();
      const mins = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12;
      return `${dayName}, ${hour12}:${mins.toString().padStart(2, "0")} ${ampm}`;
    }
    // Fallback to formatted date
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (e) {
    return dateString;
  }
}

export default function Orders() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [nowTick, setNowTick] = useState(0);

  // Load orders from API
  useEffect(() => {
    loadOrders();
  }, [filterStatus, searchQuery]);

  // Recompute overdue tag without manual refresh
  useEffect(() => {
    const id = window.setInterval(() => setNowTick((x) => x + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);
      
      const backendStatus = filterStatus === "all" ? undefined : mapStatusToFilter(filterStatus);
      const data = await fetchOrders(backendStatus, searchQuery || undefined);
      
      // Transform backend data to UI format
      const transformedOrders: OrderListItem[] = data.map((order: any) => ({
        id: order.id || "",
        orderNumber: order.orderNumber || "",
        retailerId: order.retailerId || "",
        retailer: order.retailer || "Unknown",
        location: order.location || "",
        amount: order.amount || 0,
        createdAt: order.createdAt || order.date || "",
        date: formatDate(order.createdAt || order.date || ""),
        status: mapStatusToUI(order.status || "PLACED"),
        items: order.items || 0,
        exposure: order.exposure || "NORMAL",
        dueDate: order.dueDate || null,
        unpaidAmount: typeof order.unpaidAmount === "number" ? order.unpaidAmount : Number(order.unpaidAmount ?? 0),
      }));
      
      setOrders(transformedOrders);
    } catch (e: any) {
      console.error("Failed to load orders:", e);
      setError(e?.response?.data?.message || e?.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-orange-100 text-orange-700 border-orange-200";
      case "Approved": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Packed": return "bg-purple-100 text-purple-700 border-purple-200";
      case "Out for Delivery": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "Delivered": return "bg-green-100 text-green-700 border-green-200";
      case "Cancelled": return "bg-red-100 text-red-700 border-red-200";
      case "Rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending": return Clock;
      case "Approved": return CheckCircle2;
      case "Packed": return Package;
      case "Out for Delivery": return Truck;
      case "Delivered": return CheckCircle2;
      default: return AlertTriangle;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (
      searchQuery &&
      !order.retailer.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(order.orderNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
    ) return false;
    return true;
  });

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
          
          <Select defaultValue="all">
            <SelectTrigger className="w-[150px] bg-gray-50 border-gray-200">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="hyd">Hyderabad</SelectItem>
              <SelectItem value="wgl">Warangal</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="today">
            <SelectTrigger className="w-[150px] bg-gray-50 border-gray-200">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
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
            <Button variant="outline" className="mt-4" onClick={loadOrders}>
              Retry
            </Button>
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            const displayOrderNumber = order.orderNumber || "—";
            const dueDate = order.dueDate ? new Date(order.dueDate) : null;
            const unpaid = Number(order.unpaidAmount ?? 0);
            const isOverdue =
              !!dueDate &&
              !Number.isNaN(dueDate.getTime()) &&
              new Date().getTime() > dueDate.getTime() &&
              unpaid > 0;
            return (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/30 cursor-pointer group border-gray-200 bg-white">
                  <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-4 min-w-[140px]">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-xs group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {displayOrderNumber.slice(-4)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{displayOrderNumber}</p>
                        <p className="text-xs text-gray-500">{order.date || ""}</p>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="col-span-1 sm:col-span-2">
                        <p className="font-semibold text-gray-900 truncate">{order.retailer}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                          <MapPinIcon className="h-3 w-3" /> {order.location}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{formatAmount(order.amount || 0)}</p>
                        <p className="text-xs text-gray-500">{order.items || 0} Items</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0">
                      <div className="flex items-center gap-2">
                        {isOverdue && (
                          <div className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                            OVERDUE
                          </div>
                        )}
                        {(order.exposure === "CRITICAL" || order.exposure === "Critical") && (
                          <div className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                            <AlertTriangle className="h-3 w-3" />
                            Credit Risk
                          </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          <StatusIcon className="h-3 w-3" />
                          {order.status}
                        </div>
                      </div>
                      <MoreHorizontal className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
            <Button variant="outline" className="mt-4" onClick={() => {setFilterStatus("all"); setSearchQuery("");}}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
      
      {/* Pagination Mock */}
      {filteredOrders.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button variant="ghost" className="text-gray-500 hover:text-gray-900">Load More Orders</Button>
        </div>
      )}
      <CreateOrderModal
        open={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
        onCreated={loadOrders}
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
