import { useState } from "react";
import { Link } from "wouter";
import { 
  Search, 
  Filter, 
  Phone, 
  MessageCircle, 
  MapPin, 
  ArrowUpRight, 
  MoreHorizontal,
  AlertCircle,
  Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const mockRetailers = [
  {
    id: 1,
    name: "Lakshmi Stores",
    owner: "Ravi Kumar",
    phone: "+91 98765 43210",
    location: "Hanamkonda, Telangana",
    due: "₹8,200",
    overdue: "₹3,500",
    delay: "7 days",
    lastOrder: "₹11,647 — 3 days ago",
    status: "Critical",
    initials: "LS"
  },
  {
    id: 2,
    name: "Heritage Fresh",
    owner: "Suresh Reddy",
    phone: "+91 98456 12345",
    location: "Kukatpally, Hyderabad",
    due: "₹12,400",
    overdue: "₹0",
    delay: "0 days",
    lastOrder: "₹8,200 — Today",
    status: "Good",
    initials: "HF"
  },
  {
    id: 3,
    name: "Sri Balaji Traders",
    owner: "Venkat Rao",
    phone: "+91 99887 76655",
    location: "Warangal, Telangana",
    due: "₹45,000",
    overdue: "₹15,000",
    delay: "12 days",
    lastOrder: "₹15,600 — Yesterday",
    status: "Critical",
    initials: "SB"
  },
  {
    id: 4,
    name: "Ravi Kirana General Stores",
    owner: "Ravi Teja",
    phone: "+91 90000 11111",
    location: "Uppal, Hyderabad",
    due: "₹2,100",
    overdue: "₹0",
    delay: "2 days",
    lastOrder: "₹4,500 — Yesterday",
    status: "Pending",
    initials: "RK"
  },
  {
    id: 5,
    name: "Vijaya Stores",
    owner: "Vijaya Lakshmi",
    phone: "+91 88888 99999",
    location: "Secunderabad",
    due: "₹0",
    overdue: "₹0",
    delay: "0 days",
    lastOrder: "₹2,100 — 24 Oct",
    status: "Good",
    initials: "VS"
  }
];

export default function Retailers() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRetailers = mockRetailers.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Retailers</h1>
          <p className="text-sm text-gray-500">Manage your retailer relationships and collections.</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm">
          <Plus className="h-4 w-4" />
          Add Retailer
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search retailer name, owner, or phone..." 
            className="pl-10 bg-gray-50 border-gray-200 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Select defaultValue="dues_high">
            <SelectTrigger className="w-[160px] bg-gray-50 border-gray-200">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dues_high">Dues: High to Low</SelectItem>
              <SelectItem value="dues_low">Dues: Low to High</SelectItem>
              <SelectItem value="name_az">Name: A-Z</SelectItem>
              <SelectItem value="recency">Recently Active</SelectItem>
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
        </div>
      </div>

      {/* Retailers List */}
      <div className="space-y-3">
        {filteredRetailers.map((retailer) => (
          <Link key={retailer.id} href={`/retailers/${retailer.id}`}>
            <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/30 cursor-pointer group border-gray-200 bg-white">
              <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-6">
                
                <div className="flex items-start gap-4 min-w-[280px]">
                  <Avatar className="h-12 w-12 rounded-lg border border-gray-100">
                    <AvatarFallback className="bg-gray-100 text-gray-600 font-bold rounded-lg">{retailer.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{retailer.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                       <span>{retailer.owner}</span>
                       <span className="h-1 w-1 rounded-full bg-gray-300" />
                       <span>{retailer.phone}</span>
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {retailer.location}
                    </p>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t lg:border-t-0 border-gray-100 pt-4 lg:pt-0">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Outstanding Due</p>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{retailer.due}</p>
                      {retailer.status === "Critical" && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-100 text-[10px] px-1.5 py-0 h-5">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    {retailer.status === "Critical" && (
                       <p className="text-xs text-red-600 mt-0.5">Overdue: {retailer.overdue}</p>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Avg Delay</p>
                    <p className={retailer.status === "Critical" ? "font-medium text-red-600" : "font-medium text-gray-700"}>
                      {retailer.delay}
                    </p>
                  </div>

                  <div className="hidden sm:block">
                    <p className="text-xs text-gray-500 mb-1">Last Order</p>
                    <p className="font-medium text-gray-700 text-sm">{retailer.lastOrder}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end lg:w-auto border-t lg:border-t-0 border-gray-100 pt-4 lg:pt-0">
                  <Button variant="outline" size="sm" className="h-9 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MessageCircle className="h-3.5 w-3.5" /> Msg
                  </Button>
                  {Number(retailer.overdue.replace(/[^0-9]/g, '')) > 0 && (
                     <Button size="sm" className="h-9 gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm ml-2">
                        Request Payment
                     </Button>
                  )}
                </div>

              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
