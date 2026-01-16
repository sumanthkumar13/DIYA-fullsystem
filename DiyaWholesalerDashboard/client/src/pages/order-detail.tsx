import { useState } from "react";
import { useRoute, Link } from "wouter";
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
  Clock
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

export default function OrderDetail() {
  const [match, params] = useRoute("/orders/:id");
  const { toast } = useToast();
  const [status, setStatus] = useState("Pending"); // Mock status state

  // Mock Data based on ID
  const orderId = params?.id || "DY2052";
  
  const handleApprove = () => {
    setStatus("Approved");
    toast({
      title: "Order Approved Successfully",
      description: "Invoice #INV-2025-001 has been generated.",
      className: "bg-green-50 border-green-200 text-green-800",
    });
  };

  const handlePack = () => {
    setStatus("Packed");
    toast({
      title: "Order Marked as Packed",
      description: "Ready for delivery assignment.",
    });
  };

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
            <h1 className="text-3xl font-display font-bold text-gray-900">{orderId}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="text-gray-500">Placed on 26 Oct 2025 — 10:42 AM</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {status === "Pending" && (
            <>
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                Reject Order
              </Button>
              <Button variant="outline" className="gap-2">
                <Edit2 className="h-4 w-4" /> Edit
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm shadow-orange-200" onClick={handleApprove}>
                <CheckCircle2 className="h-4 w-4" /> Approve Order
              </Button>
            </>
          )}
          
          {status === "Approved" && (
            <>
              <Button variant="outline" className="gap-2">
                <Printer className="h-4 w-4" /> Print Picklist
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-sm" onClick={handlePack}>
                <Package className="h-4 w-4" /> Mark as Packed
              </Button>
            </>
          )}

          {status === "Packed" && (
             <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm">
                <Truck className="h-4 w-4" /> Assign Delivery
             </Button>
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
                    L
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Lakshmi Stores</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5" /> Hanamkonda, Warangal Dist.
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
                        <Phone className="h-3 w-3" /> Call
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </Button>
                      <Link href="/retailers/1">
                        <Button variant="link" size="sm" className="h-8 text-xs px-0 ml-2">View Profile</Button>
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 min-w-[200px]">
                  <p className="text-xs text-orange-800 font-medium mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Outstanding Due
                  </p>
                  <p className="text-2xl font-bold text-orange-700">₹8,200</p>
                  <p className="text-xs text-orange-600 mt-1">Overdue by 7 days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items Table */}
          <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-100 py-3">
              <CardTitle className="text-sm font-semibold text-gray-700">Order Items (12)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40%]">Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[100px] text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium text-gray-900">Surf Excel Quick Wash</div>
                      <div className="text-xs text-gray-500">1kg Packet • SKU: SE-QW-1KG</div>
                    </TableCell>
                    <TableCell className="text-center">10</TableCell>
                    <TableCell className="text-right">₹180</TableCell>
                    <TableCell className="text-right font-medium">₹1,800</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">In Stock</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium text-gray-900">Parle-G Gold Biscuits</div>
                      <div className="text-xs text-gray-500">Box of 24 • SKU: PG-GLD-BX</div>
                    </TableCell>
                    <TableCell className="text-center">50</TableCell>
                    <TableCell className="text-right">₹10</TableCell>
                    <TableCell className="text-right font-medium">₹500</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">In Stock</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium text-gray-900">Lux International Soap</div>
                      <div className="text-xs text-gray-500">Pack of 4 • SKU: LX-INT-PK4</div>
                    </TableCell>
                    <TableCell className="text-center">24</TableCell>
                    <TableCell className="text-right">₹120</TableCell>
                    <TableCell className="text-right font-medium">₹2,880</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px]">Low Stock</Badge>
                    </TableCell>
                  </TableRow>
                   {/* Placeholder rows for demo */}
                   <TableRow>
                    <TableCell>
                      <div className="font-medium text-gray-900">Tata Salt</div>
                      <div className="text-xs text-gray-500">1kg Packet</div>
                    </TableCell>
                    <TableCell className="text-center">20</TableCell>
                    <TableCell className="text-right">₹22</TableCell>
                    <TableCell className="text-right font-medium">₹440</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">In Stock</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-center">
                <Button variant="ghost" size="sm" className="text-primary h-8">Show All 12 Items</Button>
              </div>
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
                <span>₹11,900.00</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>GST (5%)</span>
                <span>₹595.00</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery Charges</span>
                <span>₹150.00</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>- ₹245.00</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-gray-900">Grand Total</span>
                <span className="font-display font-bold text-xl text-gray-900">₹12,400</span>
              </div>

              {status !== "Pending" && (
                <Button variant="outline" className="w-full gap-2 mt-4">
                  <Download className="h-4 w-4" /> Download Invoice
                </Button>
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
                   <span className="font-medium text-red-600">₹8,200</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-gray-500">This Order</span>
                   <span className="font-medium text-gray-900">₹12,400</span>
                </div>
                <Separator className="bg-gray-200" />
                <div className="flex justify-between text-sm pt-1">
                   <span className="font-bold text-gray-700">Total Exposure</span>
                   <span className="font-bold text-gray-900">₹20,600</span>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 bg-yellow-50 border border-yellow-100 p-2 rounded text-center">
                  <p className="text-xs text-yellow-800 font-medium">Payment Pending</p>
                </div>
              </div>
              
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm">
                Collect Payment
              </Button>
            </CardContent>
          </Card>

          {/* Credit Limit Warning */}
           <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">Credit Limit Warning</p>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  This order pushes the retailer over their credit limit of ₹1.5L. Collect at least <strong>₹5,000</strong> to maintain healthy credit status.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    Pending: "bg-orange-100 text-orange-700 border-orange-200",
    Approved: "bg-blue-100 text-blue-700 border-blue-200",
    Packed: "bg-purple-100 text-purple-700 border-purple-200",
    Delivered: "bg-green-100 text-green-700 border-green-200",
  };
  
  return (
    <div className={cn(
      "px-3 py-1 rounded-full text-sm font-semibold border flex items-center gap-1.5",
      styles[status as keyof typeof styles] || "bg-gray-100 text-gray-700"
    )}>
      {status === "Pending" && <Clock className="h-3.5 w-3.5" />}
      {status === "Approved" && <CheckCircle2 className="h-3.5 w-3.5" />}
      {status === "Packed" && <Package className="h-3.5 w-3.5" />}
      {status}
    </div>
  );
}
