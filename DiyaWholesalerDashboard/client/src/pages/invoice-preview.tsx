import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getInvoicePreview, exportToTally } from "@/services/invoice";

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0.00";
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoicePreviewPage() {
  const [match, params] = useRoute("/invoices/:invoiceId");
  const invoiceId = params?.invoiceId ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ["invoice-preview", invoiceId],
    queryFn: () => getInvoicePreview(invoiceId),
    enabled: !!invoiceId,
  });

  const exportTallyMutation = useMutation({
    mutationFn: () => exportToTally(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-preview", invoiceId] });
      toast({
        title: "Invoice successfully posted to Tally",
        description: "The voucher has been exported.",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Failed to export to Tally",
        description: e?.response?.data?.message || e?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Invoice not found</h3>
          <p className="text-gray-500 text-sm mt-1">
            {(error as any)?.response?.status === 404
              ? "This invoice does not exist or you don't have access to it."
              : (error as any)?.message ?? "Failed to load invoice"}
          </p>
          <Link href="/orders">
            <Button variant="outline" className="mt-4">Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const items = invoice.items ?? [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/orders" className="hover:text-primary flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Orders
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Invoice {invoice.invoiceNumber}</span>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl font-display font-bold text-gray-900">
                    Invoice {invoice.invoiceNumber}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Date: {formatDate(invoice.invoiceDate)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  {invoice.tallyExported ? (
                    <Button variant="outline" disabled className="gap-2">
                      Exported to Tally
                    </Button>
                  ) : (
                    <Button
                      className="bg-primary hover:bg-primary/90 text-white gap-2"
                      onClick={() => exportTallyMutation.mutate()}
                      disabled={exportTallyMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                      {exportTallyMutation.isPending ? "Posting to Tally..." : "Send to Tally"}
                    </Button>
                  )}
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Bill To</p>
                    <p className="font-semibold text-gray-900 mt-1">{invoice.retailerName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-gray-50">
                    <TableHead className="w-[28%]">Item</TableHead>
                    <TableHead className="text-center w-[10%]">Qty</TableHead>
                    <TableHead className="text-right w-[12%]">Rate</TableHead>
                    <TableHead className="text-right w-[12%]">Taxable</TableHead>
                    <TableHead className="text-right w-[10%]">CGST</TableHead>
                    <TableHead className="text-right w-[10%]">SGST</TableHead>
                    <TableHead className="text-right w-[18%]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length > 0 ? (
                    items.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium text-gray-900">{row.productName}</div>
                          {row.hsnCode && (
                            <div className="text-xs text-gray-500">HSN: {row.hsnCode}</div>
                          )}
                          {row.sellingUnit && (
                            <div className="text-xs text-gray-500">{row.sellingUnit}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {Number(row.quantitySellingUnit)}
                        </TableCell>
                        <TableCell className="text-right">{formatAmount(row.rate)}</TableCell>
                        <TableCell className="text-right">{formatAmount(row.taxableValue)}</TableCell>
                        <TableCell className="text-right">{formatAmount(row.cgst)}</TableCell>
                        <TableCell className="text-right">{formatAmount(row.sgst)}</TableCell>
                        <TableCell className="text-right font-medium">{formatAmount(row.lineTotal)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No line items
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer totals */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex flex-col items-end gap-2 max-w-xs ml-auto">
                <div className="flex justify-between w-full text-sm">
                  <span className="text-gray-600">Taxable Total</span>
                  <span className="font-medium">{formatAmount(invoice.totalTaxable)}</span>
                </div>
                <div className="flex justify-between w-full text-sm">
                  <span className="text-gray-600">CGST Total</span>
                  <span className="font-medium">{formatAmount(invoice.totalCgst)}</span>
                </div>
                <div className="flex justify-between w-full text-sm">
                  <span className="text-gray-600">SGST Total</span>
                  <span className="font-medium">{formatAmount(invoice.totalSgst)}</span>
                </div>
                <div className="flex justify-between w-full text-base font-bold pt-2 border-t border-gray-200 mt-1">
                  <span className="text-gray-900">Grand Total</span>
                  <span className="text-gray-900">{formatAmount(invoice.grandTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500">
          Read-only preview for verification. No print or PDF yet.
        </p>
      </div>
    </div>
  );
}
