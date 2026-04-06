import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { invalidateAfterMutation } from "@/lib/invalidate";
import {
  confirmPendingPayment,
  fetchPendingPayments,
  rejectPendingPayment,
  type PendingPayment,
} from "@/services/payments";

function formatMoney(amount: number | null | undefined) {
  const n = typeof amount === "number" ? amount : 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type KhatabookSummary = {
  totalOutstanding?: number;
  collectedThisMonth?: number;
  criticalOverdue?: number;
  retailerCount?: number;
};

export default function PaymentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});

  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ["pending-payments"],
    queryFn: fetchPendingPayments,
  });

  const { data: summary } = useQuery({
    queryKey: ["khatabook-summary"],
    queryFn: async () => {
      const res = await api.get("/ledger/wholesaler/summary");
      return res.data as KhatabookSummary;
    },
  });

  const { data: totalReceivedToday } = useQuery({
    queryKey: ["payments-received-today"],
    queryFn: async () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const res = await api.get("/ledger/wholesaler", {
        params: { type: "CREDIT", fromDate: dateStr, toDate: dateStr },
      });
      const entries = (res.data ?? []) as Array<{ amount?: number }>;
      return entries.reduce((acc, e) => acc + (typeof e.amount === "number" ? e.amount : 0), 0);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (paymentId: string) => confirmPendingPayment(paymentId),
    onSuccess: () => {
      invalidateAfterMutation(queryClient);
      toast({ title: "Payment confirmed", description: "Ledger has been credited." });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to confirm",
        description: err?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason?: string }) =>
      rejectPendingPayment(paymentId, reason),
    onSuccess: () => {
      invalidateAfterMutation(queryClient);
      toast({ title: "Payment rejected" });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to reject",
        description: err?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const pendingCount = pending?.length ?? 0;
  const totalOutstanding = summary?.totalOutstanding ?? 0;

  const rows = useMemo(() => {
    return (pending ?? []) as PendingPayment[];
  }, [pending]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-500">Confirm or reject retailer-recorded payments.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Received Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">{formatMoney(totalReceivedToday)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Outstanding Across Retailers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">{formatMoney(totalOutstanding)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending payment verifications</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPending ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading pending payments...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-gray-600">No pending payments.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Retailer</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const retailerName =
                    p?.retailer?.user?.name || p?.retailer?.shopName || p?.retailer?.id || "Retailer";
                  const orderNumber = p?.order?.orderNumber || p?.order?.id || "-";
                  const rejecting = rejectMutation.isPending && rejectMutation.variables?.paymentId === p.id;
                  const confirming = confirmMutation.isPending && confirmMutation.variables === p.id;
                  const reason = rejectReasonById[p.id] ?? "";

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{retailerName}</TableCell>
                      <TableCell>{orderNumber}</TableCell>
                      <TableCell className="text-right">{formatMoney(p.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.mode}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={p.reference || ""}>
                        {p.reference || "-"}
                      </TableCell>
                      <TableCell>{formatDate(p.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => confirmMutation.mutate(p.id)}
                              disabled={confirmMutation.isPending || rejectMutation.isPending}
                            >
                              {confirming ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Confirming
                                </>
                              ) : (
                                "Confirm"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectMutation.mutate({ paymentId: p.id, reason: reason.trim() || undefined })}
                              disabled={confirmMutation.isPending || rejectMutation.isPending}
                            >
                              {rejecting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Rejecting
                                </>
                              ) : (
                                "Reject"
                              )}
                            </Button>
                          </div>
                          <input
                            className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Reject reason (optional)"
                            value={reason}
                            onChange={(e) =>
                              setRejectReasonById((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

