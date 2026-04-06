import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchKhatabookRetailers } from "@/services/khatabook";
import { fetchOrders } from "@/services/order";
import { recordManualPayment } from "@/services/payments";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { invalidateAfterMutation } from "@/lib/invalidate";

type AddPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  initialRetailerId?: string;
};

const MODES = ["CASH", "UPI", "NEFT"] as const;

export function AddPaymentModal({ open, onClose, initialRetailerId }: AddPaymentModalProps) {
  const [retailerId, setRetailerId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<string>("CASH");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && initialRetailerId) {
      setRetailerId(initialRetailerId);
    }
  }, [open, initialRetailerId]);

  const { data: retailers = [] } = useQuery({
    queryKey: ["khatabook-retailers"],
    queryFn: fetchKhatabookRetailers,
    enabled: open,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrders(),
    enabled: open,
  });

  const retailerOrders = (orders as any[]).filter((o) => String(o?.retailerId ?? "") === String(retailerId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retailerId || !orderId || !amount || Number(amount) <= 0) {
      toast({
        title: "Invalid input",
        description: "Please select retailer, order, and enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await recordManualPayment({
        retailerId,
        orderId,
        amount: Number(amount),
        mode,
        note: note.trim() || undefined,
      });
      toast({
        title: "Payment recorded",
        description: "The payment has been recorded successfully.",
      });
      invalidateAfterMutation(queryClient, { retailerId });
      setRetailerId("");
      setOrderId("");
      setAmount("");
      setMode("CASH");
      setNote("");
      onClose();
    } catch (err: any) {
      toast({
        title: "Failed to record payment",
        description: err?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retailer">Retailer</Label>
            <Select
              value={retailerId}
              onValueChange={(v) => {
                setRetailerId(v);
                setOrderId("");
              }}
              required
            >
              <SelectTrigger id="retailer">
                <SelectValue placeholder="Select retailer" />
              </SelectTrigger>
              <SelectContent>
                {retailers.map((r: { id: string; name: string }) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="order">Order</Label>
            <Select value={orderId} onValueChange={setOrderId} required disabled={!retailerId}>
              <SelectTrigger id="order">
                <SelectValue placeholder={retailerId ? "Select order" : "Select retailer first"} />
              </SelectTrigger>
              <SelectContent>
                {retailerOrders.map((o) => (
                  <SelectItem key={String(o.id)} value={String(o.id)}>
                    {o.orderNumber ? `Order #${o.orderNumber}` : `Order #${o.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mode">Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger id="mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Optional note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
