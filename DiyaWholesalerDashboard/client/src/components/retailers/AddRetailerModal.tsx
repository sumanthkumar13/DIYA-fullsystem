import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { createRetailer } from "@/services/retailer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WHOLESALER_REGIONS } from "@/lib/regions";

type AddRetailerModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AddRetailerModal({ open, onClose }: AddRetailerModalProps) {
  const [retailerName, setRetailerName] = useState("");
  const [phone, setPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [notes, setNotes] = useState("");
  const [region, setRegion] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedPhone = phone.replace(/\D/g, "");
    if (!retailerName.trim() || !shopName.trim() || trimmedPhone.length !== 10 || !region) {
      toast({
        title: "Invalid input",
        description: "Please fill all required fields, select a region, and enter a valid 10-digit phone number.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await createRetailer({
        retailerName: retailerName.trim(),
        phone: trimmedPhone,
        shopName: shopName.trim(),
        region,
        address: address.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
        creditLimit: creditLimit ? Number(creditLimit) : undefined,
        notes: notes.trim() || undefined,
      });

      toast({
        title: "Retailer added",
        description: "Retailer has been invited successfully.",
      });

      // Refresh retailer-related data
      queryClient.invalidateQueries({ queryKey: ["khatabook-retailers"] });
      queryClient.invalidateQueries({ queryKey: ["territory-performance"] });
      queryClient.invalidateQueries({ queryKey: ["active-regions"] });

      setRetailerName("");
      setPhone("");
      setShopName("");
      setAddress("");
      setGstNumber("");
      setCreditLimit("");
      setNotes("");
      setRegion("");
      onClose();
    } catch (err: any) {
      toast({
        title: "Failed to add retailer",
        description: err?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Retailer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retailerName">Retailer Name</Label>
            <Input
              id="retailerName"
              value={retailerName}
              onChange={(e) => setRetailerName(e.target.value)}
              placeholder="Owner / Contact name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 rounded-l-md bg-gray-50 text-sm text-gray-500">
                +91
              </span>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210"
                className="rounded-l-none"
                maxLength={10}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopName">Shop Name</Label>
            <Input
              id="shopName"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Retailer shop name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Select Region</Label>
            <Select value={region || undefined} onValueChange={setRegion} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose retailer territory" />
              </SelectTrigger>
              <SelectContent>
                {WHOLESALER_REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address (optional)</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="Street, area, city"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number (optional)</Label>
              <Input
                id="gstNumber"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="GSTIN"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Credit Limit (₹)</Label>
              <Input
                id="creditLimit"
                type="number"
                min="0"
                step="0.01"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any remarks about this retailer"
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
                "Save Retailer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

