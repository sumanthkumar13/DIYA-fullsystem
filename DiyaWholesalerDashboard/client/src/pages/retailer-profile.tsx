import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
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
  Ban,
  UserMinus,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  fetchRetailerCreditSummary,
  patchRetailerCreditLimit,
  blockRetailer,
  unblockRetailer,
  removeRetailerFromList,
} from "@/services/retailerCredit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchOrders, OrderListItem } from "@/services/order";
import { fetchRetailerStatement } from "@/services/khatabook";
import { AddPaymentModal } from "@/components/payments/AddPaymentModal";
import { RetailerTierBadge } from "@/components/retailers/RetailerTierBadge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { invalidateAfterMutation } from "@/lib/invalidate";
import { formatINR } from "@/lib/money";
import {
  normalizeWholesalerOrderListItem,
  wholesalerOrderUiStatusPillClass,
} from "@/lib/wholesalerOrderStatus";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function formatAmount(n: number) {
  return formatINR(n);
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function connectionStatusBadgeClass(status: string) {
  if (status === "BLOCKED") {
    return "bg-amber-50 text-amber-800 border-amber-200";
  }
  if (status === "REMOVED") {
    return "bg-gray-100 text-gray-700 border-gray-200";
  }
  return "bg-green-50 text-green-800 border-green-200";
}

function connectionStatusLabel(status: string) {
  if (status === "BLOCKED") return "Blocked";
  if (status === "REMOVED") return "Removed";
  return "Active";
}

function orderStatusIcon(uiStatus: string) {
  switch (uiStatus) {
    case "Pending":
      return Clock;
    case "Approved":
      return CheckCircle2;
    case "Packed":
      return Package;
    case "Out for Delivery":
      return Truck;
    case "Delivered":
      return CheckCircle2;
    case "Cancelled":
    case "Rejected":
      return XCircle;
    default:
      return AlertTriangle;
  }
}

export default function RetailerProfile() {
  const [match, params] = useRoute("/retailers/:id");
  const retailerId = params?.id ?? "";
  const [, setLocation] = useLocation();
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [creditLimitInput, setCreditLimitInput] = useState("");
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["retailer-credit", retailerId],
    queryFn: () => fetchRetailerCreditSummary(retailerId),
    enabled: !!retailerId,
    refetchOnMount: "always",
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
      invalidateAfterMutation(queryClient, { retailerId });
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

  const connectionStatus = data?.connectionStatus ?? "APPROVED";
  const isActive = connectionStatus === "APPROVED";
  const isBlocked = connectionStatus === "BLOCKED";
  const isRemoved = connectionStatus === "REMOVED";

  const blockMutation = useMutation({
    mutationFn: () => blockRetailer(retailerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retailer-credit", retailerId] });
      queryClient.invalidateQueries({ queryKey: ["wholesaler-connections"] });
      invalidateAfterMutation(queryClient, { retailerId });
      setBlockDialogOpen(false);
      toast({ title: "Retailer blocked", description: "They can no longer place new orders." });
    },
    onError: (err: any) => {
      toast({
        title: "Could not block retailer",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: () => unblockRetailer(retailerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retailer-credit", retailerId] });
      queryClient.invalidateQueries({ queryKey: ["wholesaler-connections"] });
      invalidateAfterMutation(queryClient, { retailerId });
      toast({ title: "Retailer unblocked", description: "They can place orders again." });
    },
    onError: (err: any) => {
      toast({
        title: "Could not unblock retailer",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => removeRetailerFromList(retailerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wholesaler-connections"] });
      queryClient.invalidateQueries({ queryKey: ["retailer-credit", retailerId] });
      invalidateAfterMutation(queryClient, { retailerId });
      setRemoveDialogOpen(false);
      toast({
        title: "Retailer removed from list",
        description: "Historical orders and payments are unchanged.",
      });
      setLocation("/retailers");
    },
    onError: (err: any) => {
      toast({
        title: "Could not remove retailer",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    },
  });

  const pageSize = 20;
  const [retailerOrders, setRetailerOrders] = useState<OrderListItem[]>([]);
  const [retailerOrdersLoading, setRetailerOrdersLoading] = useState(false);
  const [retailerOrdersLoadingMore, setRetailerOrdersLoadingMore] = useState(false);
  const [retailerOrdersHasMore, setRetailerOrdersHasMore] = useState(false);
  const retailerOrdersLastPageRef = useRef(-1);
  const retailerOrdersLoadingMoreRef = useRef(false);
  const retailerOrdersAppendNewRef = useRef(0);

  const loadRetailerOrders = useCallback(
    async (opts: { reset: boolean; pageOverride?: number }) => {
      if (!retailerId) return;
      try {
        if (opts.reset) {
          setRetailerOrdersLoading(true);
          setRetailerOrders([]);
          retailerOrdersLastPageRef.current = -1;
        } else {
          if (retailerOrdersLoadingMoreRef.current) return;
          retailerOrdersLoadingMoreRef.current = true;
          setRetailerOrdersLoadingMore(true);
        }

        const nextPage = opts.reset
          ? (opts.pageOverride ?? 0)
          : opts.pageOverride !== undefined
            ? opts.pageOverride
            : retailerOrdersLastPageRef.current + 1;

        const raw = await fetchOrders(
          undefined,
          undefined,
          undefined,
          undefined,
          retailerId,
          nextPage,
          pageSize
        );
        const arr = Array.isArray(raw) ? raw : [];
        const batch = arr.map((o: unknown) =>
          normalizeWholesalerOrderListItem(o as Record<string, unknown>)
        );

        setRetailerOrders((prev) => {
          if (opts.reset) {
            retailerOrdersAppendNewRef.current = batch.length;
            return batch;
          }
          const seen = new Set(prev.map((x) => x.id).filter(Boolean));
          let newItems = 0;
          const merged = [...prev];
          for (const o of batch) {
            if (o.id && !seen.has(o.id)) {
              seen.add(o.id);
              merged.push(o);
              newItems++;
            }
          }
          retailerOrdersAppendNewRef.current = newItems;
          return merged;
        });

        const newItems = retailerOrdersAppendNewRef.current;
        const batchFull = arr.length === pageSize;
        if (!opts.reset && batchFull && newItems === 0) {
          setRetailerOrdersHasMore(false);
        } else {
          setRetailerOrdersHasMore(batchFull);
        }
        retailerOrdersLastPageRef.current = nextPage;
      } catch (e) {
        console.error(e);
        if (opts.reset) {
          setRetailerOrders([]);
          setRetailerOrdersHasMore(false);
        }
      } finally {
        retailerOrdersLoadingMoreRef.current = false;
        setRetailerOrdersLoading(false);
        setRetailerOrdersLoadingMore(false);
      }
    },
    [retailerId, pageSize]
  );

  useEffect(() => {
    if (!retailerId) return;
    setRetailerOrdersHasMore(false);
    void loadRetailerOrders({ reset: true, pageOverride: 0 });
  }, [retailerId, loadRetailerOrders]);

  const { data: statement, isLoading: statementLoading } = useQuery({
    queryKey: ["retailer-statement", retailerId],
    queryFn: () => fetchRetailerStatement(retailerId),
    enabled: !!retailerId,
    refetchOnMount: "always",
  });

  const shopDisplayName = (data?.shopName?.trim() || data?.retailerName?.trim() || "Retailer");
  const ownerDisplayName =
    data?.proprietorName?.trim() ||
    data?.retailerName?.trim() ||
    shopDisplayName;
  const headerTitle = shopDisplayName;
  const initials = ownerDisplayName.slice(0, 2).toUpperCase();
  const locationLine =
    (data?.region && String(data.region).trim()) ||
    [data?.city, data?.state].map((v) => (typeof v === "string" ? v.trim() : String(v || "").trim())).filter(Boolean).join(", ") ||
    "—";
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
        <span className="text-gray-900 font-medium">{headerTitle}</span>
      </div>

      {!isLoading && data && !isRemoved && (isActive || isBlocked) && (
        <Card className="border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Retailer management</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {isBlocked
                ? "This retailer is blocked and cannot place new orders. Past data stays available."
                : "Block to stop new orders, or remove from your active list without deleting history."}
            </p>
            <div className="flex flex-wrap gap-2 shrink-0">
              {isActive && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-amber-200 text-amber-800 hover:bg-amber-50"
                    disabled={blockMutation.isPending}
                    onClick={() => setBlockDialogOpen(true)}
                  >
                    <Ban className="h-4 w-4" />
                    Block retailer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive border-red-200 hover:bg-red-50"
                    disabled={removeMutation.isPending}
                    onClick={() => setRemoveDialogOpen(true)}
                  >
                    <UserMinus className="h-4 w-4" />
                    Remove retailer
                  </Button>
                </>
              )}
              {isBlocked && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-green-200 text-green-800 hover:bg-green-50"
                    disabled={unblockMutation.isPending}
                    onClick={() => unblockMutation.mutate()}
                  >
                    Unblock retailer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive border-red-200 hover:bg-red-50"
                    disabled={removeMutation.isPending}
                    onClick={() => setRemoveDialogOpen(true)}
                  >
                    <UserMinus className="h-4 w-4" />
                    Remove retailer
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && data && isRemoved && (
        <Card className="border-gray-200 shadow-sm bg-gray-50/80">
          <CardContent className="py-4 text-sm text-gray-600">
            This retailer was removed from your active list. You can still review orders, ledger, and history. Recording
            payments and editing credit limit is disabled.
          </CardContent>
        </Card>
      )}

      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block this retailer?</AlertDialogTitle>
            <AlertDialogDescription>
              They will not be able to place new orders. Existing orders, payments, and the ledger are unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blockMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={blockMutation.isPending}
              onClick={() => blockMutation.mutate()}
            >
              {blockMutation.isPending ? "Blocking…" : "Block retailer"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove retailer from your list?</AlertDialogTitle>
            <AlertDialogDescription>
              They will disappear from your active retailer and connection lists. Historical data is kept for your
              records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => removeMutation.mutate()}
            >
              {removeMutation.isPending ? "Removing…" : "Remove retailer"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <h1 className="text-2xl font-bold text-gray-900">{headerTitle}</h1>
                {!isLoading && data && (
                  <Badge variant="outline" className={cn("font-medium", connectionStatusBadgeClass(connectionStatus))}>
                    {connectionStatusLabel(connectionStatus)}
                  </Badge>
                )}
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
                          disabled={isRemoved}
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="shrink-0"
                          disabled={saveCreditMutation.isPending || !retailerId || isRemoved}
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
                 
                 <Button
                   onClick={() => setAddPaymentOpen(true)}
                   disabled={isRemoved}
                   className="w-full bg-primary hover:bg-primary/90 text-white shadow-sm disabled:opacity-60"
                 >
                   Record Payment
                 </Button>
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
                         {initials}
                       </span>
                    </div>
                    <div>
                       <p className="font-medium text-gray-900">{isLoading ? "…" : ownerDisplayName}</p>
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
                       <span className="break-words">{addressDisplay}</span>
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
              
              <TabsContent value="orders" className="mt-0 space-y-3">
                 {retailerOrdersLoading ? (
                   <Card className="bg-white border-gray-200 shadow-sm">
                     <CardContent className="p-8 text-center">
                       <p className="text-gray-500 text-sm">Loading orders…</p>
                     </CardContent>
                   </Card>
                 ) : retailerOrders.length === 0 ? (
                   <Card className="bg-white border-gray-200 shadow-sm">
                     <CardContent className="p-8 text-center">
                       <Package className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                       <p className="text-gray-500 text-sm">No orders for this retailer.</p>
                     </CardContent>
                   </Card>
                 ) : (
                   <>
                   <div className="flex flex-col gap-2">
                 {retailerOrders.map((order: OrderListItem) => {
                    const StatusIcon = orderStatusIcon(order.status);
                    return (
                    <Link key={order.id} href={`/orders/${order.id}`}>
                    <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                       <CardContent className="p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-4 min-w-0">
                             <div className="h-10 w-10 shrink-0 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Package className="h-5 w-5" />
                             </div>
                             <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate">{order.orderNumber ? `Order #${order.orderNumber}` : `Order #${order.id}`}</p>
                                <p className="text-xs text-gray-500">{order.date ? order.date : ""}{order.date ? " • " : ""}{order.items ?? 0} Items</p>
                             </div>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                             <p className="font-bold text-gray-900 tabular-nums">{formatAmount(order.amount ?? 0)}</p>
                             <div className={cn(
                               "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                               wholesalerOrderUiStatusPillClass(order.status)
                             )}>
                               <StatusIcon className="h-3 w-3 shrink-0" />
                               {order.status}
                             </div>
                          </div>
                       </CardContent>
                    </Card>
                    </Link>
                 );})}
                   </div>
                   {retailerOrdersHasMore && (
                     <div className="flex justify-center pt-1">
                       <Button
                         type="button"
                         variant="ghost"
                         size="sm"
                         className="text-gray-500 hover:text-gray-900"
                         disabled={retailerOrdersLoadingMore}
                         onClick={() => void loadRetailerOrders({ reset: false })}
                       >
                         {retailerOrdersLoadingMore ? "Loading…" : "Load more orders"}
                       </Button>
                     </div>
                   )}
                   </>
                 )}
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
                      const orderRef = line.orderNumber || line.orderId;
                      const orderDate = line.orderDate ? formatDate(line.orderDate) : "";
                      const paymentMethod = line.paymentMethod || "";
                      const paymentDate = line.paymentDate ? formatDate(line.paymentDate) : (line.date ? formatDate(line.date) : "");

                      let description = line.description || "";
                      if (!isDebit) {
                        if (orderRef) {
                          description = `Payment ${formatAmount(Number(line.amount ?? 0))} received for Order #${orderRef}${
                            orderDate ? ` on ${orderDate}` : ""
                          }${paymentMethod ? ` via ${paymentMethod}` : ""}`;
                        } else {
                          description = `Payment ${formatAmount(Number(line.amount ?? 0))} received`;
                        }
                      } else {
                        // For debits, keep existing description; fall back to order reference if needed
                        if (!description && orderRef) {
                          description = `Goods supplied (Order #${orderRef})`;
                        }
                      }
                       return (
                         <Card key={index} className="bg-white border-gray-200 shadow-sm">
                           <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-medium text-gray-500">{label}</p>
                              <p className="text-sm text-gray-900 mt-0.5">{description || (isDebit ? "Goods supplied" : "Payment received")}</p>
                              <p className="text-xs text-gray-400 mt-1">{paymentDate}</p>
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
