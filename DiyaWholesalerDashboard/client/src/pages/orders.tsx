import { useState } from "react";
import { Link } from "wouter";
import { 
  Search, 
  Filter, 
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

const mockOrders = [
  {
    id: "DY2052",
    retailer: "Lakshmi Stores",
    location: "Hanamkonda, Telangana",
    amount: "₹12,400",
    date: "Today, 10:42 AM",
    status: "Pending",
    items: 12,
    exposure: "Normal"
  },
  {
    id: "DY2051",
    retailer: "Heritage Fresh",
    location: "Kukatpally, Hyderabad",
    amount: "₹8,200",
    date: "Today, 09:15 AM",
    status: "Approved",
    items: 8,
    exposure: "Warning"
  },
  {
    id: "DY2050",
    retailer: "Ravi Kirana General Stores",
    location: "Uppal, Hyderabad",
    amount: "₹4,500",
    date: "Yesterday, 06:30 PM",
    status: "Packed",
    items: 5,
    exposure: "Normal"
  },
  {
    id: "DY2049",
    retailer: "Sri Balaji Traders",
    location: "Warangal, Telangana",
    amount: "₹15,600",
    date: "Yesterday, 04:15 PM",
    status: "Out for Delivery",
    items: 22,
    exposure: "Critical"
  },
  {
    id: "DY2048",
    retailer: "Vijaya Stores",
    location: "Secunderabad",
    amount: "₹2,100",
    date: "24 Oct, 11:00 AM",
    status: "Delivered",
    items: 3,
    exposure: "Normal"
  }
];

export default function Orders() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-orange-100 text-orange-700 border-orange-200";
      case "Approved": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Packed": return "bg-purple-100 text-purple-700 border-purple-200";
      case "Out for Delivery": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "Delivered": return "bg-green-100 text-green-700 border-green-200";
      case "Returned": return "bg-red-100 text-red-700 border-red-200";
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

  const filteredOrders = mockOrders.filter(order => {
    if (filterStatus !== "all" && order.status !== filterStatus) return false;
    if (searchQuery && !order.retailer.toLowerCase().includes(searchQuery.toLowerCase()) && !order.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
          <Button variant="outline" className="gap-2 bg-white">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm">
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
            placeholder="Search by retailer or Order ID..." 
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
              <SelectItem value="Delivered">Delivered</SelectItem>
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
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            return (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/30 cursor-pointer group border-gray-200 bg-white">
                  <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-4 min-w-[140px]">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-xs group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {order.id.slice(-4)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{order.id}</p>
                        <p className="text-xs text-gray-500">{order.date}</p>
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
                        <p className="font-bold text-gray-900">{order.amount}</p>
                        <p className="text-xs text-gray-500">{order.items} Items</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0">
                      <div className="flex items-center gap-2">
                        {order.exposure === "Critical" && (
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
