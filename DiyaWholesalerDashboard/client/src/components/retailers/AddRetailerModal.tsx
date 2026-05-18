import { useEffect, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useIndiaPostTerritory } from "@/hooks/useIndiaPostTerritory";
import { getGstinValidationError, normalizeGstin } from "@/lib/gstin";

type AddRetailerModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called after a retailer is created so parent lists can refetch. */
  onCreated?: () => void;
};

export function AddRetailerModal({ open, onClose, onCreated }: AddRetailerModalProps) {
  const [retailerName, setRetailerName] = useState("");
  const [phone, setPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    pincodeDigits,
    setPincodeDigits,
    pinLoading,
    pinApiError,
    postOfficeSuggestions,
    postOfficeOpen,
    setPostOfficeOpen,
    selectedPostOffice,
    setSelectedPostOffice,
    districtHint,
    inferredState,
    territoryTrim,
    resetTerritory,
  } = useIndiaPostTerritory();

  const retailerNameTrim = retailerName.trim();
  const shopNameTrim = shopName.trim();
  const gstTrim = normalizeGstin(gstNumber);
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

  const gstError = getGstinValidationError(gstNumber);

  const pincodeError = (() => {
    if (!pincodeDigits) return "Pincode is required.";
    if (!/^\d{6}$/.test(pincodeDigits)) return "Pincode must be exactly 6 digits.";
    return "";
  })();

  const cityTownError = (() => {
    if (pincodeDigits.length !== 6 || pinApiError || pinLoading) return "";
    if (!territoryTrim) return "Select City / Town from the list.";
    return "";
  })();

  const stateTrim = inferredState.trim();
  const stateError = !stateTrim ? "State is required (enter a valid pincode)." : "";

  const formValid =
    !retailerNameError &&
    !shopNameError &&
    !phoneError &&
    !gstError &&
    !pincodeError &&
    pincodeDigits.length === 6 &&
    !pinLoading &&
    !pinApiError &&
    !cityTownError &&
    !!stateTrim &&
    !!territoryTrim;

  const markTouched = (key: string) => setTouched((p) => ({ ...p, [key]: true }));

  useEffect(() => {
    if (open) return;
    setRetailerName("");
    setPhone("");
    setShopName("");
    setAddress("");
    setGstNumber("");
    setCreditLimit("");
    setNotes("");
    setTouched({});
    resetTerritory();
  }, [open, resetTerritory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      retailerName: true,
      phone: true,
      shopName: true,
      gstNumber: true,
      pincode: true,
      cityTown: true,
      state: true,
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
        region: territoryTrim,
        city: territoryTrim,
        state: stateTrim,
        pincode: pincodeDigits,
        address: address.trim() || undefined,
        gstNumber: gstTrim || undefined,
        creditLimit: creditLimit ? Number(creditLimit) : undefined,
        notes: notes.trim() || undefined,
      });

      toast({
        title: "Retailer added",
        description: "Retailer has been invited successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ["khatabook-retailers"] });
      queryClient.invalidateQueries({ queryKey: ["territory-performance"] });
      queryClient.invalidateQueries({ queryKey: ["retailer-regions"] });

      onCreated?.();
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
      <DialogContent
        className={cn(
          "flex min-h-0 w-[calc(100vw-1.5rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:w-full",
          "max-h-[min(90dvh,720px)] sm:max-w-md"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle>Add Retailer</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          <form id="add-retailer-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
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
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                  +91
                </span>
                <Input
                  id="phone"
                  value={phoneDigits}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onBlur={() => markTouched("phone")}
                  placeholder="98765 43210"
                  className="rounded-l-none"
                  maxLength={10}
                  inputMode="numeric"
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
              <Label htmlFor="pincode">Pincode</Label>
              <div className="relative">
                <Input
                  id="pincode"
                  value={pincodeDigits}
                  onChange={(e) => {
                    setPincodeDigits(e.target.value);
                    if (touched.pincode) markTouched("pincode");
                  }}
                  onBlur={() => markTouched("pincode")}
                  inputMode="numeric"
                  pattern="\d*"
                  placeholder="500081"
                  maxLength={6}
                />
                {pinLoading && pincodeDigits.length === 6 && !pinApiError && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                )}
              </div>
              {touched.pincode && pincodeError && <p className="text-xs text-red-600">{pincodeError}</p>}
              {!pincodeError && pinApiError && <p className="text-xs text-red-600">{pinApiError}</p>}
              {pinLoading && pincodeDigits.length === 6 && !pinApiError && (
                <p className="text-xs text-gray-500">Fetching location…</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>City / Town</Label>
                <Popover open={postOfficeOpen} onOpenChange={setPostOfficeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={postOfficeOpen}
                      className={cn(
                        "h-11 w-full justify-between border-gray-200 bg-gray-50 font-normal hover:bg-gray-50",
                        !selectedPostOffice && "text-muted-foreground"
                      )}
                      disabled={
                        pinLoading || pincodeDigits.length !== 6 || !!pinApiError || postOfficeSuggestions.length === 0
                      }
                      onClick={() => markTouched("cityTown")}
                    >
                      <span className="truncate text-left">
                        {selectedPostOffice ||
                          (districtHint ? `Tap to select (area: ${districtHint})` : "Enter pincode first")}
                      </span>
                      <span className="shrink-0 text-gray-400">⌄</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search post office…" />
                      <CommandList>
                        <CommandEmpty>No locations found.</CommandEmpty>
                        <CommandGroup>
                          {postOfficeSuggestions.map((name) => (
                            <CommandItem
                              key={name}
                              value={name}
                              onSelect={(v) => {
                                const chosen = (v || name).trim();
                                setSelectedPostOffice(chosen);
                                setPostOfficeOpen(false);
                                markTouched("cityTown");
                              }}
                            >
                              {name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {touched.cityTown && cityTownError && <p className="text-xs text-red-600">{cityTownError}</p>}
                {districtHint && !pinApiError && pincodeDigits.length === 6 && (
                  <p className="text-xs text-gray-500">
                    District: {districtHint}. Select the post office that matches the retailer&apos;s location.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="inferredState">State</Label>
                <Input
                  id="inferredState"
                  value={inferredState}
                  readOnly
                  tabIndex={-1}
                  placeholder="Autofilled from pincode"
                  className="h-11 cursor-default bg-gray-50 text-gray-900"
                  onBlur={() => markTouched("state")}
                />
                {touched.state && stateError && <p className="text-xs text-red-600">{stateError}</p>}
              </div>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <DialogFooter className="sticky bottom-0 flex-col gap-2 border-t border-border bg-background pt-4 sm:flex-row sm:justify-end">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
