import { useState, useEffect, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProducts } from "@/services/product";
import { searchRetailers, type RetailerSearchResult } from "@/services/retailer";
import { createOrder } from "@/services/order";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Plus } from "lucide-react";
import { ProductPicker } from "@/components/orders/ProductPicker";

type CreateOrderModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

type OrderItemRow = {
  productId: string;
  productLabel?: string;
  quantity: string;
};

export function CreateOrderModal({ open, onClose, onCreated }: CreateOrderModalProps) {
  const [retailerId, setRetailerId] = useState("");
  const [retailerSearch, setRetailerSearch] = useState("");
  const [retailerResults, setRetailerResults] = useState<RetailerSearchResult[]>([]);
  const [retailerLoading, setRetailerLoading] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<RetailerSearchResult | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const retailerInputRef = useRef<HTMLInputElement | null>(null);
  const retailerDropdownRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([{ productId: "", productLabel: "", quantity: "" }]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: productsData } = useQuery({
    queryKey: ["wholesaler-products-for-order"],
    queryFn: () => fetchProducts(0, 100),
    enabled: open,
  });

  const products: any[] = Array.isArray(productsData?.content) ? productsData.content : (Array.isArray(productsData) ? productsData : []);

  // Debounced retailer search
  useEffect(() => {
    let active = true;
    const q = retailerSearch.trim();
    if (!isDropdownOpen && !q) return;
    setRetailerLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await searchRetailers(q);
        if (!active) return;
        setRetailerResults(res);
      } catch {
        if (!active) return;
        setRetailerResults([]);
      } finally {
        if (active) setRetailerLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [retailerSearch, isDropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const inputEl = retailerInputRef.current;
      const dropdownEl = retailerDropdownRef.current;
      if (!inputEl && !dropdownEl) return;
      if (
        inputEl &&
        inputEl.contains(e.target as Node)
      ) {
        return;
      }
      if (dropdownEl && dropdownEl.contains(e.target as Node)) {
        return;
      }
      setIsDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRetailerSelect = (r: RetailerSearchResult) => {
    setRetailerId(r.id);
    setSelectedRetailer(r);
    setRetailerSearch(r.name);
    setRetailerResults([]);
    setIsDropdownOpen(false);
  };

  const handleAddRow = () => {
    setItems((prev) => [...prev, { productId: "", quantity: "" }]);
  };

  const handleRemoveRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items
      .map((row) => ({
        productId: row.productId,
        quantity: Number(row.quantity),
      }))
      .filter((row) => row.productId && row.quantity > 0);

    if (!retailerId || validItems.length === 0) {
      toast({
        title: "Invalid input",
        description: "Please select a retailer and add at least one product with quantity.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await createOrder({
        retailerId,
        items: validItems,
        notes: notes.trim() || undefined,
      });

      toast({
        title: "Order created",
        description: "The order has been created successfully.",
      });

      // Refresh orders list / related views
      queryClient.invalidateQueries({ queryKey: ["khatabook-retailers"] });

      setRetailerId("");
      setRetailerSearch("");
      setItems([{ productId: "", quantity: "" }]);
      setNotes("");
      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      toast({
        title: "Failed to create order",
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Retailer</Label>
            <div className="relative" ref={retailerDropdownRef}>
              <Input
                ref={retailerInputRef}
                placeholder="Search retailer..."
                value={selectedRetailer ? selectedRetailer.name : retailerSearch}
                onChange={(e) => {
                  setRetailerId("");
                  setSelectedRetailer(null);
                  setRetailerSearch(e.target.value);
                  setIsDropdownOpen(true);
                }}
              />
              {isDropdownOpen && (retailerLoading || retailerResults.length > 0) && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-white shadow-md">
                  {retailerLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching retailers...
                    </div>
                  ) : retailerResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No retailers found</div>
                  ) : (
                    retailerResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-100"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          handleRetailerSelect(r);
                        }}
                      >
                        <span className="font-medium">
                          {r.name}
                          {r.shopName && r.shopName !== r.name ? ` – ${r.shopName}` : ""}
                        </span>
                        {r.location && (
                          <span className="text-xs text-gray-500">{r.location}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Products</Label>
            <div className="space-y-3">
              {items.map((row, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-7 space-y-1">
                    <Label className="text-xs text-gray-500">Product</Label>
                    <ProductPicker
                      value={
                        row.productId
                          ? {
                              productId: row.productId,
                              productLabel:
                                row.productLabel ||
                                products.find((p: any) => String(p.id) === String(row.productId))?.name ||
                                "Selected product",
                            }
                          : null
                      }
                      placeholder="Search product or category..."
                      onPick={(picked) =>
                        setItems((prev) =>
                          prev.map((r, i) =>
                            i === index
                              ? { ...r, productId: picked.productId, productLabel: picked.productLabel }
                              : r
                          )
                        )
                      }
                    />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <Label htmlFor={`qty-${index}`} className="text-xs text-gray-500">
                      Qty
                    </Label>
                    <Input
                      id={`qty-${index}`}
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, quantity: e.target.value } : r
                          )
                        )
                      }
                    />
                  </div>
                  <div className="col-span-1 flex items-end">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveRow(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 gap-1"
              onClick={handleAddRow}
            >
              <Plus className="h-3 w-3" /> Add Product
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-notes">Order Notes (optional)</Label>
            <Textarea
              id="order-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any remarks for this order"
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
                  Creating...
                </>
              ) : (
                "Create Order"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

