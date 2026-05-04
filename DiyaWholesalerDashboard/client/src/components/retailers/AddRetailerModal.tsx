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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const retailerNameTrim = retailerName.trim();
  const shopNameTrim = shopName.trim();
  const gstTrim = gstNumber.trim().toUpperCase();
  const phoneDigits = phone.replace(/\D/g, "");

  const retailerNameError = (() => {
    if (!retailerNameTrim) return "Retailer name is required.";
    if (!/^[A-Za-z ]+$/.test(retailerNameTrim)) return "Retailer name can contain only alphabets and spaces.";
    return "";
  })();

  const shopNameError = (() => {
    if (!shopNameTrim) return "Shop name is required.";
    if (!/^[A-Za-z0-9&., -]+$/.test(shopNameTrim)) {
      return "Shop name can include letters, numbers, spaces, and symbols: & . , -";
    }
    if (!/[A-Za-z0-9]/.test(shopNameTrim)) return "Shop name must include at least one letter or number.";
    return "";
  })();

  const phoneError = (() => {
    if (!phoneDigits) return "Phone number is required.";
    if (phoneDigits.length !== 10) return "Enter a valid 10-digit phone number.";
    return "";
  })();

  const gstError = (() => {
    if (!gstTrim) return "";
    const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
    if (!GSTIN_RE.test(gstTrim)) return "Please enter a valid GSTIN (15 characters).";
    return "";
  })();

  const regionError = !region ? "Region is required." : "";

  const formValid = !retailerNameError && !shopNameError && !phoneError && !gstError && !!region;

  const markTouched = (key: string) => setTouched((p) => ({ ...p, [key]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      retailerName: true,
      phone: true,
      shopName: true,
      gstNumber: true,
      region: true,
    });

    if (!formValid) {
      toast({
        title: "Invalid input",
        description: "Please fix the highlighted fields and try again.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await createRetailer({
        retailerName: retailerNameTrim,
        phone: phoneDigits,
        shopName: shopNameTrim,
        region,
        address: address.trim() || undefined,
        gstNumber: gstTrim || undefined,
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
      queryClient.invalidateQueries({ queryKey: ["retailer-regions"] });

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
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.message;
      const friendly =
        status === 409
          ? "Retailer already exists"
          : typeof apiMsg === "string" && apiMsg.trim()
            ? apiMsg
            : "Please try again.";
      toast({
        title: status === 409 ? "Retailer already exists" : "Failed to add retailer",
        description: friendly,
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
              onBlur={() => markTouched("retailerName")}
              placeholder="Owner / Contact name"
              required
            />
            {touched.retailerName && retailerNameError && (
              <p className="text-xs text-red-600">{retailerNameError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 rounded-l-md bg-gray-50 text-sm text-gray-500">
                +91
              </span>
              <Input
                id="phone"
                value={phoneDigits}
                onChange={(e) => setPhone(e.target.value.replace(/\\D/g, "").slice(0, 10))}
                onBlur={() => markTouched("phone")}
                placeholder="98765 43210"
                className="rounded-l-none"
                maxLength={10}
              />
            </div>
            {touched.phone && phoneError && <p className="text-xs text-red-600">{phoneError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopName">Shop Name</Label>
            <Input
              id="shopName"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              onBlur={() => markTouched("shopName")}
              placeholder="Retailer shop name"
              required
            />
            {touched.shopName && shopNameError && <p className="text-xs text-red-600">{shopNameError}</p>}
          </div>
          <div className="space-y-2">
            <Label>Select Region</Label>
            <Select
              value={region || undefined}
              onValueChange={(v) => {
                setRegion(v);
                markTouched("region");
              }}
              required
            >
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
            {touched.region && regionError && <p className="text-xs text-red-600">{regionError}</p>}
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
                value={gstTrim}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                onBlur={() => markTouched("gstNumber")}
                placeholder="GSTIN"
                maxLength={15}
              />
              {touched.gstNumber && gstError && <p className="text-xs text-red-600">{gstError}</p>}
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
            <Button type="submit" disabled={saving || !formValid}>
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

