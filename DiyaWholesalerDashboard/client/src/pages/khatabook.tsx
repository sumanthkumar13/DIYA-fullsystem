import { useState } from "react";
import { Link } from "wouter";
import { 
  Search, 
  Filter, 
  Phone, 
  MessageCircle, 
  ArrowUpRight, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  Download,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mockKhatabook = [
  {
    id: 1,
    name: "Lakshmi Stores",
    location: "Hanamkonda",
    due: "₹8,200",
    overdue: "₹3,500",
    lastPayment: "3 days ago",
    status: "Critical",
    initials: "LS"
  },
  {
    id: 2,
    name: "Heritage Fresh",
    location: "Kukatpally",
    due: "₹12,400",
    overdue: "₹0",
    lastPayment: "Today",
    status: "Good",
    initials: "HF"
  },
  {
    id: 3,
    name: "Sri Balaji Traders",
    location: "Warangal",
    due: "₹45,000",
    overdue: "₹15,000",
    lastPayment: "12 days ago",
    status: "Critical",
    initials: "SB"
  },
  {
    id: 4,
    name: "Ravi Kirana",
    location: "Uppal",
    due: "₹2,100",
    overdue: "₹0",
    lastPayment: "Yesterday",
    status: "Pending",
    initials: "RK"
  },
  {
    id: 5,
    name: "Vijaya Stores",
    location: "Secunderabad",
    due: "₹0",
    overdue: "₹0",
    lastPayment: "24 Oct",
    status: "Settled",
    initials: "VS"
  }
];

export default function Khatabook() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredList = mockKhatabook.filter(item => {
    if (filterStatus !== "all") {
      if (filterStatus === "Critical" && item.status !== "Critical") return false;
      if (filterStatus === "Pending" && item.status !== "Pending") return false;
      if (filterStatus === "Settled" && item.status !== "Settled") return false;
    }
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Khatabook</h1>
          <p className="text-sm text-gray-500">Track retailer dues and manage collections efficiently.</p>
        </div>
        <Button variant="outline" className="gap-2 bg-white">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-500 mb-1">Total Outstanding Due</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-display font-bold text-gray-900">₹8.4L</h3>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">+5%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Across 142 retailers</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-500 mb-1">Critical Overdue</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-display font-bold text-red-600">₹2.1L</h3>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded animate-pulse">Urgent</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Needs immediate attention</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-500 mb-1">Collected This Month</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-display font-bold text-green-600">₹12.5L</h3>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">+12%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search retailer name..." 
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
              {status === "all" ? "All Dues" : status}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredList.map((item) => (
          <Card key={item.id} className="group hover:shadow-md transition-all duration-200 hover:border-primary/30 cursor-pointer bg-white border-gray-200">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex items-center gap-4 flex-1">
                <Avatar className="h-12 w-12 border border-gray-100">
                  <AvatarFallback className={`font-bold ${item.status === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                    {item.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    Last paid: {item.lastPayment}
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
                <div className="flex gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-primary hover:bg-orange-50">
                      <Phone className="h-4 w-4" />
                   </Button>
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-green-600 hover:bg-green-50">
                      <MessageCircle className="h-4 w-4" />
                   </Button>
                </div>
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
        ))}
      </div>
    </div>
  );
}
