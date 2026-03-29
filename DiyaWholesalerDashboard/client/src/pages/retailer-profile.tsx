import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  MapPin,
  TrendingUp,
  AlertTriangle,
  FileText,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { fetchRetailerCreditSummary, patchRetailerCreditLimit } from "@/services/retailerCredit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchOrders, OrderListItem } from "@/services/order";
import { fetchRetailerStatement } from "@/services/khatabook";
import { AddPaymentModal } from "@/components/payments/AddPaymentModal";
import { RetailerTierBadge } from "@/components/retailers/RetailerTierBadge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function formatAmount(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function mapStatusToUI(status: string): string {
  const m: Record<string, string> = {
    PLACED: "Pending", ACCEPTED: "Approved", PACKING: "Packed",
    DISPATCHED: "Out for Delivery", DELIVERED: "Delivered",
    COMPLETED: "Delivered", CANCELLED: "Cancelled", REJECTED: "Rejected",
  };
  return m[status] || status;
}

export default function RetailerProfile() {
  const [match, params] = useRoute("/retailers/:id");
  const retailerId = params?.id ?? "";
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [creditLimitInput, setCreditLimitInput] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["retailer-credit", retailerId],
    queryFn: () => fetchRetailerCreditSummary(retailerId),
    enabled: !!retailerId,
  });

  useEffect(() => {
    if (data == null) return;
    const v = data.creditLimit;
    setCreditLimitInput(
      v != null && v !== undefined && Number(v) >= 0 ? String(Number(v)) : ""
    );
  }, [retailerId, data?.creditLimit]);

  const saveCreditMutation = useMutation({
    mutationFn: () => {
      const trimmed = creditLimitInput.trim();
      if (trimmed === "") {
        return patchRetailerCreditLimit(retailerId, null);
      }
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) {
        return Promise.reject(new Error("Enter a valid non-negative amount"));
      }
      return patchRetailerCreditLimit(retailerId, n);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retailer-credit", retailerId] });
      toast({
        title: "Credit limit updated",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not update credit limit",
        description: err?.message,
        variant: "destructive",
      });
    },
  });

  const { data: ordersData } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrders(),
    enabled: !!retailerId && !!data?.retailerName,
  });
  const orders = (ordersData || []).filter(
    (o: OrderListItem) => (o as any).retailerId === retailerId || o.retailer === data?.retailerName
  );

  const { data: statement, isLoading: statementLoading } = useQuery({
    queryKey: ["retailer-statement", retailerId],
    queryFn: () => fetchRetailerStatement(retailerId),
    enabled: !!retailerId,
  });

  const retailerName = data?.retailerName ?? "Retailer";
  const initials = retailerName.slice(0, 2).toUpperCase();
  const locationLine =
    [data?.city, data?.state].filter(Boolean).join(", ") || "—";
  const phoneDisplay = data?.phoneContact ? `+91 ${data.phoneContact}` : "—";
  const addressDisplay = data?.address || "—";

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Link href="/retailers" className="hover:text-primary flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Retailers
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{retailerName}</span>
      </div>

      {/* Profile Header */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-100" />
        <CardContent className="relative px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-12">
            <Avatar className="h-24 w-24 border-4 border-white shadow-md rounded-xl">
              <AvatarFallback className="bg-gray-800 text-white text-2xl font-bold rounded-xl">{initials}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{retailerName}</h1>
                <RetailerTierBadge tier={data?.tier} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1 text-gray-900 font-medium">
                  <MapPin className="h-4 w-4 text-gray-400" /> {locationLine}
                </span>
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
                    <p className="text-3xl font-display font-bold text-red-700 mt-1">
                      {isLoading ? "Loading..." : data == null ? "--" : formatAmount(Number(data?.totalOutstanding ?? 0))}
                    </p>
                    <p className="text-xs text-red-500 mt-2 font-medium flex items-center justify-center gap-1">
                        {isLoading ? "..." : data == null ? "--" : (Number(data?.overdueDays ?? 0) === 0 ? "On Time" : (
                          <><AlertTriangle className="h-3 w-3" /> {data?.overdueDays} days overdue</>
                        ))}
                    </p>
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Credit Limit</span>
                       <span className="font-medium">{isLoading ? "..." : data == null ? "—" : formatAmount(Number(data?.creditLimit ?? 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Credit Given</span>
                       <span className="font-medium">{isLoading ? "..." : data == null ? "—" : formatAmount(Number(data?.creditGiven ?? 0))}</span>
                    </div>
                    <div className="pt-2 space-y-2 border-t border-gray-100">
                      <Label htmlFor="creditLimitEdit" className="text-xs text-gray-500">Set credit limit (₹)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="creditLimitEdit"
                          type="number"
                          min={0}
                          step={1}
                          placeholder="e.g. 50000"
                          value={creditLimitInput}
                          onChange={(e) => setCreditLimitInput(e.target.value)}
                          className="h-9"
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="shrink-0"
                          disabled={saveCreditMutation.isPending || !retailerId}
                          onClick={() => saveCreditMutation.mutate()}
                        >
                          {saveCreditMutation.isPending ? "Saving…" : "Save"}
                        </Button>
                      </div>
                      {saveCreditMutation.isError && (
                        <p className="text-xs text-red-600">{(saveCreditMutation.error as Error)?.message || "Save failed"}</p>
                      )}
                    </div>
                 </div>
                 
                 <Button onClick={() => setAddPaymentOpen(true)} className="w-full bg-primary hover:bg-primary/90 text-white shadow-sm">Record Payment</Button>
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
                       <span className="font-bold text-gray-500">
                         {(data?.proprietorName || retailerName).slice(0, 2).toUpperCase()}
                       </span>
                    </div>
                    <div>
                       <p className="font-medium text-gray-900">{isLoading ? "…" : data?.proprietorName || retailerName}</p>
                       <p className="text-xs text-gray-500">Proprietor</p>
                    </div>
                 </div>
                 <Separator />
                 <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                       <Phone className="h-4 w-4 text-gray-400 shrink-0" /> {phoneDisplay}
                    </div>
                    <div className="flex items-start gap-2 text-gray-600">
                       <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                       <span className="break-words">{data?.shopName ? `${data.shopName}${addressDisplay !== "—" ? `, ${addressDisplay}` : ""}` : addressDisplay}</span>
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
                 {orders.length === 0 ? (
                   <Card className="bg-white border-gray-200 shadow-sm">
                     <CardContent className="p-8 text-center">
                       <Package className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                       <p className="text-gray-500 text-sm">No orders for this retailer.</p>
                     </CardContent>
                   </Card>
                 ) : (
                 orders.map((order: OrderListItem) => (
                    <Link key={order.id} href={`/orders/${order.id}`}>
                    <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                       <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Package className="h-5 w-5" />
                             </div>
                             <div>
                                <p className="font-bold text-gray-900">{order.orderNumber ? `Order #${order.orderNumber}` : `Order #${order.id}`}</p>
                                <p className="text-xs text-gray-500">{order.date ? formatDate(order.date) : ""} • {order.items ?? 0} Items</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="font-bold text-gray-900">{formatAmount(order.amount ?? 0)}</p>
                             <Badge variant="secondary" className="bg-green-50 text-green-700 text-[10px]">{mapStatusToUI(order.status)}</Badge>
                          </div>
                       </CardContent>
                    </Card>
                    </Link>
                 )))}
              </TabsContent>
              
              <TabsContent value="ledger" className="mt-0">
                 {statementLoading ? (
                   <Card className="bg-white border-gray-200 shadow-sm">
                     <CardContent className="p-8 text-center">
                       <p className="text-gray-500 text-sm">Loading statement...</p>
                     </CardContent>
                   </Card>
                 ) : !statement?.ledger?.length ? (
                   <Card className="bg-white border-gray-200 shadow-sm">
                     <CardContent className="p-8 text-center">
                       <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                       <h3 className="text-lg font-medium text-gray-900">Ledger View</h3>
                       <p className="text-gray-500 text-sm">No transactions yet with this retailer.</p>
                     </CardContent>
                   </Card>
                 ) : (
                   <div className="space-y-3">
                     {statement.ledger.map((line: any, index: number) => {
                       const isDebit = (line.type || "").toUpperCase() === "DEBIT";
                       const label = isDebit ? "Goods Given" : "Payment Received";
                       return (
                         <Card key={index} className="bg-white border-gray-200 shadow-sm">
                           <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-medium text-gray-500">{label}</p>
                               <p className="text-sm text-gray-900 mt-0.5">{line.description || (isDebit ? "Goods supplied" : "Payment received")}</p>
                               <p className="text-xs text-gray-400 mt-1">{formatDate(line.date)}</p>
                             </div>
                             <div className="text-left sm:text-right shrink-0">
                               <p className={cn("text-lg font-bold", isDebit ? "text-red-600" : "text-green-600")}>
                                 {isDebit ? "+" : "−"} {formatAmount(Number(line.amount ?? 0))}
                               </p>
                               <p className="text-xs text-gray-500 mt-1">Balance after this: {formatAmount(Number(line.runningBalance ?? 0))}</p>
                             </div>
                           </CardContent>
                         </Card>
                       );
                     })}
                   </div>
                 )}
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

      <AddPaymentModal open={addPaymentOpen} onClose={() => setAddPaymentOpen(false)} initialRetailerId={retailerId || undefined} />
    </div>
  );
}
