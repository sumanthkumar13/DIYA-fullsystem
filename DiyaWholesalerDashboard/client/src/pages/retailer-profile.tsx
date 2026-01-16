import { useState } from "react";
import { useRoute, Link } from "wouter";
import { 
  ArrowLeft, 
  Phone, 
  MessageCircle, 
  MapPin, 
  MoreHorizontal, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CreditCard,
  History,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function RetailerProfile() {
  const [match, params] = useRoute("/retailers/:id");
  
  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Link href="/retailers" className="hover:text-primary flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Retailers
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Lakshmi Stores</span>
      </div>

      {/* Profile Header */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-100 relative">
            <div className="absolute top-4 right-4 flex gap-2">
                <Badge className="bg-white/80 text-orange-700 hover:bg-white border-white/50 backdrop-blur-sm">Gold Tier</Badge>
            </div>
        </div>
        <CardContent className="relative px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-12">
            <Avatar className="h-24 w-24 border-4 border-white shadow-md rounded-xl">
              <AvatarFallback className="bg-gray-800 text-white text-2xl font-bold rounded-xl">LS</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 pb-2">
              <h1 className="text-2xl font-bold text-gray-900">Lakshmi Stores</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1 text-gray-900 font-medium"><MapPin className="h-4 w-4 text-gray-400" /> Hanamkonda, Warangal</span>
                <span className="hidden md:inline text-gray-300">|</span>
                <span className="flex items-center gap-1">GSTIN: 36ABCDE1234F1Z5</span>
              </div>
            </div>

            <div className="flex gap-3 pb-2">
               <Button variant="outline" className="gap-2">
                  <Phone className="h-4 w-4" /> Call
               </Button>
               <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white border-none shadow-sm">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
               </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar Info */}
        <div className="space-y-6">
           {/* Credit Status Card */}
           <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-3">
                 <CardTitle className="text-base">Credit Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-center">
                    <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Total Outstanding</p>
                    <p className="text-3xl font-display font-bold text-red-700 mt-1">₹8,200</p>
                    <p className="text-xs text-red-500 mt-2 font-medium flex items-center justify-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Overdue by 7 days
                    </p>
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Credit Limit</span>
                       <span className="font-medium">₹1,50,000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Available Credit</span>
                       <span className="font-medium text-green-600">₹1,41,800</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                       <div className="h-full bg-green-500 w-[5%] rounded-full" />
                    </div>
                 </div>
                 
                 <Button className="w-full bg-primary hover:bg-primary/90 text-white shadow-sm">Record Payment</Button>
              </CardContent>
           </Card>

           {/* Owner Details */}
           <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-3">
                 <CardTitle className="text-base">Owner Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                       <span className="font-bold text-gray-500">RK</span>
                    </div>
                    <div>
                       <p className="font-medium text-gray-900">Ravi Kumar</p>
                       <p className="text-xs text-gray-500">Proprietor</p>
                    </div>
                 </div>
                 <Separator />
                 <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                       <Phone className="h-4 w-4 text-gray-400" /> +91 98765 43210
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                       <MapPin className="h-4 w-4 text-gray-400" /> 
                       <span className="truncate">Shop No. 4, Main Road, Hanamkonda</span>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Main Content Tabs */}
        <div className="lg:col-span-2">
           <Tabs defaultValue="orders" className="w-full">
              <TabsList className="w-full justify-start bg-transparent border-b border-gray-200 rounded-none h-12 p-0 mb-6">
                 <TabsTrigger value="orders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent h-12 px-6 font-medium">Orders</TabsTrigger>
                 <TabsTrigger value="ledger" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent h-12 px-6 font-medium">Ledger</TabsTrigger>
                 <TabsTrigger value="insights" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent h-12 px-6 font-medium">Insights</TabsTrigger>
              </TabsList>
              
              <TabsContent value="orders" className="space-y-4 mt-0">
                 {/* Order History List */}
                 {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                       <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Package className="h-5 w-5" />
                             </div>
                             <div>
                                <p className="font-bold text-gray-900">Order #DY205{2-i}</p>
                                <p className="text-xs text-gray-500">2{6-i} Oct 2025 • 12 Items</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="font-bold text-gray-900">₹12,400</p>
                             <Badge variant="secondary" className="bg-green-50 text-green-700 text-[10px]">Delivered</Badge>
                          </div>
                       </CardContent>
                    </Card>
                 ))}
              </TabsContent>
              
              <TabsContent value="ledger" className="mt-0">
                 <Card className="bg-white border-gray-200 shadow-sm">
                    <CardContent className="p-8 text-center">
                       <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                       <h3 className="text-lg font-medium text-gray-900">Ledger View</h3>
                       <p className="text-gray-500 text-sm">Detailed transaction history will be shown here.</p>
                    </CardContent>
                 </Card>
              </TabsContent>

              <TabsContent value="insights" className="mt-0">
                 <Card className="bg-white border-gray-200 shadow-sm">
                    <CardContent className="p-8 text-center">
                       <TrendingUp className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                       <h3 className="text-lg font-medium text-gray-900">Retailer Insights</h3>
                       <p className="text-gray-500 text-sm">Purchase patterns and product preferences.</p>
                    </CardContent>
                 </Card>
              </TabsContent>
           </Tabs>
        </div>
      </div>
    </div>
  );
}
