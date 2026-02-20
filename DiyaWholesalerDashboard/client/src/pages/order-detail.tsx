import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  CheckCircle2, 
  Package, 
  Truck, 
  AlertTriangle, 
  Edit2, 
  Phone, 
  MessageCircle, 
  MapPin,
  CreditCard,
  Info,
  Clock,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { fetchOrderDetail, acceptOrder, rejectOrder, updateOrderStatus, editOrder } from "@/services/order";
import { finalizeInvoice } from "@/services/invoice";

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
    INVOICED: "Invoiced",
  };
  return statusMap[status] || status;
}

// Format date
function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (e) {
    return dateString;
  }
}

// Format amount
function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return "₹0";
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function OrderDetail() {
  const [match, params] = useRoute("/orders/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orderId = params?.id || "";

  // Fetch order detail
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => fetchOrderDetail(orderId),
    enabled: !!orderId,
  });

  // Status mutations
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CREDIT">("CASH");
  const [creditDays, setCreditDays] = useState<string>("");
  const [approvedCreditAmount, setApprovedCreditAmount] = useState<string>("");

  const acceptMutation = useMutation({
    mutationFn: (opts: { force: boolean }) =>
      acceptOrder(orderId, {
        force: opts.force,
        paymentMode,
        creditDays: paymentMode === "CREDIT" ? Number(creditDays) : 0,
        ...(paymentMode === "CREDIT" && { approvedCreditAmount: Number(approvedCreditAmount) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Order Approved Successfully",
        description: "Order status has been updated.",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      setAcceptOpen(false);
    },
    onError: (e: any) => {
      toast({
        title: "Failed to approve order",
        description: e?.response?.data?.message || e?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Order Rejected",
        description: "Order has been rejected.",
        className: "bg-red-50 border-red-200 text-red-800",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Failed to reject order",
        description: e?.response?.data?.message || e?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (action: "packing" | "dispatch" | "deliver" | "complete") => 
      updateOrderStatus(orderId, action),
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      const actionNames: Record<string, string> = {
        packing: "Marked as Packed",
        dispatch: "Dispatched",
        deliver: "Delivered",
        complete: "Completed",
      };
      toast({
        title: `Order ${actionNames[action] || "Updated"}`,
        description: "Order status has been updated.",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Failed to update order",
        description: e?.response?.data?.message || e?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const editOrderMutation = useMutation({
    mutationFn: (payload: { reason: string; items: Array<{ orderItemId: string; newQty?: number; newUnitPrice?: number }> }) =>
      editOrder(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Order updated",
        description: "Changes saved successfully.",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Failed to edit order",
        description: e?.response?.data?.message || e?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const finalizeInvoiceMutation = useMutation({
    mutationFn: () => finalizeInvoice(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Invoice created successfully",
        description: "The invoice has been generated.",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Failed to generate invoice",
        description: e?.response?.data?.message || e?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => setAcceptOpen(true);
  const handleReject = () => rejectMutation.mutate();
  const handlePack = () => updateStatusMutation.mutate("packing");
  const handleDispatch = () => updateStatusMutation.mutate("dispatch");
  const handleDeliver = () => updateStatusMutation.mutate("deliver");

  // ===== Edit modal state =====
  const [editOpen, setEditOpen] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [editDraft, setEditDraft] = useState<Record<string, { qty: string; price: string }>>({});

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Error loading order</h3>
          <p className="text-gray-500 text-sm mt-1">
            {(error as any)?.response?.data?.message || (error as any)?.message || "Order not found"}
          </p>
          <Link href="/orders">
            <Button variant="outline" className="mt-4">Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const status = mapStatusToUI(order.status || "PLACED");
  const retailer = order.retailer;
  const retailerName = retailer?.name || retailer?.shopName || "Unknown Retailer";
  const retailerInitial = retailerName.charAt(0).toUpperCase();
  const retailerLocation = retailer 
    ? `${retailer.city || ""}${retailer.city && retailer.state ? ", " : ""}${retailer.state || ""}`.trim() || "Location not available"
    : "Location not available";
  const orderItems = order.items || [];
  const hasShortage = orderItems.some((it: any) => (it.orderedQty ?? 0) > (it.availableStock ?? 0));
  const placedDate = formatDate(order.placedAt);

  return (
    <div className="space-y-6 pb-12">
      {/* Back & Header */}
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Link href="/orders" className="hover:text-primary flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{orderId}</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold text-gray-900">{order.orderNumber || orderId}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="text-gray-500">{placedDate ? `Placed on ${placedDate}` : "Date not available"}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {status === "Pending" && (
            <>
              <Button 
                variant="outline" 
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
              >
                Reject Order
              </Button>
              <Dialog open={editOpen} onOpenChange={(open) => {
                setEditOpen(open);
                if (open) {
                  // initialize draft from current items
                  const next: Record<string, { qty: string; price: string }> = {};
                  for (const it of orderItems) {
                    const id = it.orderItemId;
                    if (!id) continue;
                    next[id] = {
                      qty: String(it.orderedQty ?? 0),
                      price: String(it.unitPriceSnapshot ?? 0),
                    };
                  }
                  setEditDraft(next);
                  setEditReason("");
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Edit2 className="h-4 w-4" /> Edit Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[720px]">
                  <DialogHeader>
                    <DialogTitle>Edit Order</DialogTitle>
                    <DialogDescription>
                      Update quantities/prices. A reason is mandatory. Changes apply immediately (no retailer approval).
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Reason (required)</label>
                      <textarea
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="Why are you editing this order?"
                        className="w-full min-h-[80px] rounded-md border border-gray-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
                        Items
                      </div>
                      <div className="divide-y">
                        {orderItems.map((it: any) => {
                          const id = it.orderItemId;
                          const draft = id ? editDraft[id] : undefined;
                          return (
                            <div key={id ?? it.productNameSnapshot} className="p-4 grid grid-cols-12 gap-3 items-center">
                              <div className="col-span-6">
                                <div className="font-medium text-gray-900">{it.productNameSnapshot}</div>
                                <div className="text-xs text-gray-500">{it.unitSnapshot || "pcs"}</div>
                              </div>
                              <div className="col-span-3">
                                <label className="block text-xs text-gray-500 mb-1">Qty</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={draft?.qty ?? ""}
                                  onChange={(e) => {
                                    if (!id) return;
                                    setEditDraft((prev) => ({
                                      ...prev,
                                      [id]: { ...(prev[id] ?? { qty: "", price: "" }), qty: e.target.value },
                                    }));
                                  }}
                                  className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                                />
                              </div>
                              <div className="col-span-3">
                                <label className="block text-xs text-gray-500 mb-1">Unit Price</label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={draft?.price ?? ""}
                                  onChange={(e) => {
                                    if (!id) return;
                                    setEditDraft((prev) => ({
                                      ...prev,
                                      [id]: { ...(prev[id] ?? { qty: "", price: "" }), price: e.target.value },
                                    }));
                                  }}
                                  className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-primary hover:bg-primary/90 text-white"
                      disabled={editOrderMutation.isPending || editReason.trim().length === 0}
                      onClick={() => {
                        const payloadItems = Object.entries(editDraft)
                          .map(([orderItemId, v]) => ({
                            orderItemId,
                            newQty: Number(v.qty),
                            newUnitPrice: Number(v.price),
                          }));
                        editOrderMutation.mutate(
                          { reason: editReason, items: payloadItems },
                          { onSuccess: () => setEditOpen(false) }
                        );
                      }}
                    >
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={acceptOpen} onOpenChange={(open) => {
                setAcceptOpen(open);
                if (open && order?.totalAmount != null) {
                  setApprovedCreditAmount(String(order.totalAmount));
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm shadow-orange-200" 
                    onClick={handleApprove}
                    disabled={acceptMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[520px]">
                  <DialogHeader>
                    <DialogTitle>Accept Order</DialogTitle>
                    <DialogDescription>
                      Choose payment type. For CREDIT, set credit days (due date = acceptedAt + creditDays).
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Payment Type</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as any)}
                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="CASH">Cash (Immediate)</option>
                        <option value="UPI">UPI (Immediate)</option>
                        <option value="CREDIT">Credit</option>
                      </select>
                      {paymentMode === "CREDIT" && (
                        <p className="text-xs text-gray-500">
                          Retailer must pay within these days after order acceptance.
                        </p>
                      )}
                    </div>

                    {paymentMode === "CREDIT" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Credit Days (required)</label>
                        <input
                          type="number"
                          min={1}
                          value={creditDays}
                          onChange={(e) => setCreditDays(e.target.value)}
                          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                    )}

                    {paymentMode === "CREDIT" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Credit Amount Allowed</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={approvedCreditAmount}
                          onChange={(e) => setApprovedCreditAmount(e.target.value)}
                          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                        />
                        <p className="text-xs text-gray-500">
                          This is the amount you are willing to supply on credit for this order.
                        </p>
                      </div>
                    )}

                    {hasShortage && (
                      <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <div>
                          <div className="font-semibold">Stock shortage detected</div>
                          <div className="text-xs text-yellow-800">Normal accept may fail. You can force accept to proceed.</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAcceptOpen(false)}>
                      Cancel
                    </Button>
                    {hasShortage && (
                      <Button
                        variant="outline"
                        className="border-yellow-200 text-yellow-800 hover:bg-yellow-50 hover:text-yellow-900"
                        disabled={acceptMutation.isPending || (paymentMode === "CREDIT" && (Number(creditDays) <= 0 || !approvedCreditAmount || Number(approvedCreditAmount) <= 0))}
                        onClick={() => acceptMutation.mutate({ force: true })}
                      >
                        Force Accept
                      </Button>
                    )}
                    <Button
                      className="bg-primary hover:bg-primary/90 text-white"
                      disabled={acceptMutation.isPending || (paymentMode === "CREDIT" && (Number(creditDays) <= 0 || !approvedCreditAmount || Number(approvedCreditAmount) <= 0))}
                      onClick={() => acceptMutation.mutate({ force: false })}
                    >
                      Accept
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
          
          {status === "Approved" && (
            <>
              <Button variant="outline" className="gap-2">
                <Printer className="h-4 w-4" /> Print Picklist
              </Button>
              <Button 
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-sm" 
                onClick={handlePack}
                disabled={updateStatusMutation.isPending}
              >
                <Package className="h-4 w-4" /> Mark as Packed
              </Button>
            </>
          )}

          {status === "Packed" && (
             <Button 
               className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm"
               onClick={handleDispatch}
               disabled={updateStatusMutation.isPending}
             >
                <Truck className="h-4 w-4" /> Dispatch Order
             </Button>
          )}

          {status === "Out for Delivery" && (
             <Button 
               className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm"
               onClick={handleDeliver}
               disabled={updateStatusMutation.isPending}
             >
                <CheckCircle2 className="h-4 w-4" /> Mark Delivered
             </Button>
          )}

          {order.status === "DELIVERED" && !order.invoiceId && (
            <Button
              className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm"
              onClick={() => finalizeInvoiceMutation.mutate()}
              disabled={finalizeInvoiceMutation.isPending}
            >
              <Printer className="h-4 w-4" /> Generate Invoice
            </Button>
          )}

          {order.invoiceId && (
            <Link href={`/invoices/${order.invoiceId}`}>
              <Button variant="outline" className="gap-2">
                <Printer className="h-4 w-4" /> View Invoice
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Content - Order Items & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Retailer Card */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-500">
                    {retailerInitial}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{retailerName}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5" /> {retailerLocation}
                    </p>
                    {retailer?.phone && (
                      <div className="flex items-center gap-3 mt-3">
                        <Button variant="outline" size="sm" className="h-8 gap-2 text-xs" asChild>
                          <a href={`tel:${retailer.phone}`}>
                            <Phone className="h-3 w-3" /> Call
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-2 text-xs" asChild>
                          <a href={`https://wa.me/${retailer.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </a>
                        </Button>
                        {retailer?.id && (
                          <Link href={`/retailers/${retailer.id}`}>
                            <Button variant="link" size="sm" className="h-8 text-xs px-0 ml-2">View Profile</Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 min-w-[200px]">
                  <p className="text-xs text-orange-800 font-medium mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Outstanding Due
                  </p>
                  <p className="text-2xl font-bold text-orange-700">₹0</p>
                  <p className="text-xs text-orange-600 mt-1">Payment status: {order.paymentStatus || "UNPAID"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items Table */}
          <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-100 py-3">
              <CardTitle className="text-sm font-semibold text-gray-700">Order Items ({orderItems.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40%]">Product</TableHead>
                    <TableHead className="text-center">Ordered</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Reserved</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.length > 0 ? (
                    orderItems.map((item: any, index: number) => (
                      (() => {
                        const orderedQty = item.orderedQty ?? 0;
                        const available = item.availableStock ?? 0;
                        const shortage = orderedQty > available;
                        return (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            <span>{item.productNameSnapshot || "Unknown Product"}</span>
                            {shortage && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200 text-[10px]">
                                Short
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{item.unitSnapshot || "pcs"}</div>
                        </TableCell>
                        <TableCell className="text-center">{orderedQty}</TableCell>
                        <TableCell className="text-center">{item.currentStock ?? 0}</TableCell>
                        <TableCell className="text-center">{item.currentReservedStock ?? 0}</TableCell>
                        <TableCell className={cn("text-center font-medium", shortage ? "text-yellow-800" : "")}>{available}</TableCell>
                        <TableCell className="text-right">{formatAmount(item.unitPriceSnapshot)}</TableCell>
                        <TableCell className="text-right font-medium">{formatAmount(item.lineTotal)}</TableCell>
                      </TableRow>
                        );
                      })()
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Content - Payment & Summary */}
        <div className="space-y-6">
          {/* Price Breakdown */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Item Total</span>
                <span>{formatAmount(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>GST (5%)</span>
                <span>{formatAmount(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery Charges</span>
                <span>{formatAmount(order.deliveryCharge)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-gray-900">Grand Total</span>
                <span className="font-display font-bold text-xl text-gray-900">{formatAmount(order.totalAmount)}</span>
              </div>

              {order.invoiceId && (
                <Link href={`/invoices/${order.invoiceId}`}>
                  <Button variant="outline" className="w-full gap-2 mt-4">
                    <Download className="h-4 w-4" /> View Invoice
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Payment Context */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-500" /> 
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                   <span className="text-gray-500">Previous Due</span>
                   <span className="font-medium text-red-600">₹0</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-gray-500">This Order</span>
                   <span className="font-medium text-gray-900">{formatAmount(order.totalAmount)}</span>
                </div>
                <Separator className="bg-gray-200" />
                <div className="flex justify-between text-sm pt-1">
                   <span className="font-bold text-gray-700">Total Exposure</span>
                   <span className="font-bold text-gray-900">{formatAmount(order.totalAmount)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <div className={`flex-1 border p-2 rounded text-center ${
                  order.paymentStatus === "PAID" 
                    ? "bg-green-50 border-green-100" 
                    : order.paymentStatus === "PARTIAL"
                    ? "bg-yellow-50 border-yellow-100"
                    : "bg-yellow-50 border-yellow-100"
                }`}>
                  <p className={`text-xs font-medium ${
                    order.paymentStatus === "PAID" 
                      ? "text-green-800" 
                      : order.paymentStatus === "PARTIAL"
                      ? "text-yellow-800"
                      : "text-yellow-800"
                  }`}>
                    {order.paymentStatus === "PAID" 
                      ? "Payment Received" 
                      : order.paymentStatus === "PARTIAL"
                      ? "Partially Paid"
                      : "Payment Pending"}
                  </p>
                </div>
              </div>
              
              {order.paymentStatus !== "PAID" && (
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm">
                  Collect Payment
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Credit Limit Warning - Only show if needed */}
           {order.paymentStatus === "UNPAID" && order.totalAmount && order.totalAmount > 10000 && (
             <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800">Payment Reminder</p>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    This order amount is {formatAmount(order.totalAmount)}. Ensure payment is collected.
                  </p>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Pending: "bg-orange-100 text-orange-700 border-orange-200",
    Approved: "bg-blue-100 text-blue-700 border-blue-200",
    Packed: "bg-purple-100 text-purple-700 border-purple-200",
    "Out for Delivery": "bg-indigo-100 text-indigo-700 border-indigo-200",
    Delivered: "bg-green-100 text-green-700 border-green-200",
    Invoiced: "bg-teal-100 text-teal-700 border-teal-200",
    Cancelled: "bg-red-100 text-red-700 border-red-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
  };
  
  return (
    <div className={cn(
      "px-3 py-1 rounded-full text-sm font-semibold border flex items-center gap-1.5",
      styles[status] || "bg-gray-100 text-gray-700"
    )}>
      {status === "Pending" && <Clock className="h-3.5 w-3.5" />}
      {status === "Approved" && <CheckCircle2 className="h-3.5 w-3.5" />}
      {status === "Packed" && <Package className="h-3.5 w-3.5" />}
      {status === "Out for Delivery" && <Truck className="h-3.5 w-3.5" />}
      {(status === "Delivered" || status === "Completed") && <CheckCircle2 className="h-3.5 w-3.5" />}
      {(status === "Cancelled" || status === "Rejected") && <XCircle className="h-3.5 w-3.5" />}
      {status}
    </div>
  );
}
