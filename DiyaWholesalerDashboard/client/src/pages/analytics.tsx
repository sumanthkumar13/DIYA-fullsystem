import { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  MapPin,
  Download,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";

const salesData = [
  { name: "Week 1", sales: 40000 },
  { name: "Week 2", sales: 30000 },
  { name: "Week 3", sales: 55000 },
  { name: "Week 4", sales: 48000 },
  { name: "Week 5", sales: 65000 },
];

const retailerData = [
  { name: "Lakshmi Stores", value: 125000 },
  { name: "Heritage Fresh", value: 98000 },
  { name: "Sri Balaji", value: 85000 },
  { name: "Vijaya Stores", value: 62000 },
  { name: "Ravi Kirana", value: 45000 },
];

const COLORS = ['#FF7A00', '#27AE60', '#2D9CDB', '#F2C94C', '#EB5757'];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Business Analytics</h1>
          <p className="text-sm text-gray-500">Insights to grow your wholesale business.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="month">
            <SelectTrigger className="w-[140px] bg-white border-gray-200 shadow-sm">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2 bg-white shadow-sm">
            <Download className="h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Revenue This Month</p>
                <h3 className="text-3xl font-display font-bold text-gray-900 mt-2">₹24.5L</h3>
              </div>
              <div className="p-2 bg-green-50 rounded-lg text-green-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-green-600 font-medium">+14.2%</span>
              <span className="text-gray-400">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg. Payment Delay</p>
                <h3 className="text-3xl font-display font-bold text-gray-900 mt-2">4.2 Days</h3>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-green-600 font-medium">-1.2 Days</span>
              <span className="text-gray-400">improved vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Territory Status</p>
                <h3 className="text-3xl font-display font-bold text-gray-900 mt-2">Gold 🏆</h3>
              </div>
              <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                <MapPin className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-gray-600 font-medium">Hyderabad Region</span>
              <span className="text-gray-400">• Performing Well</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Monthly Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#FF7A00" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#FF7A00', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#FF7A00" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Retailers Chart */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top 5 Retailers (by Revenue)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={retailerData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    width={100}
                    tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }}
                  />
                  <Tooltip 
                    cursor={{fill: '#f9fafb'}}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {retailerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
