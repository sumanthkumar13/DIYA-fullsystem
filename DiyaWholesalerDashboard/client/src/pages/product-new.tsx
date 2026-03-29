import { useEffect, useState, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createProduct, fetchProduct, updateProduct } from "@/services/product";
import { suggestHsn } from "@/services/hsn";
import {
  fetchCategories,
  fetchSubcategoriesByCategory,
  createCategory,
  createSubcategory,
} from "@/services/category";

type Category = {
  id: string;
  name: string;
};

type SubCategory = {
  id: string;
  name: string;
};

export default function AddProductPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editMatch, editParams] = useRoute("/products/edit/:id");
  const productId = editMatch && editParams?.id ? editParams.id : null;

  const qs = new URLSearchParams(window.location.search);
  const presetCategoryId = qs.get("categoryId") || "";
  const presetSubcategoryId = qs.get("subcategoryId") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [stock, setStock] = useState("");

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!productId);

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  const [newCategory, setNewCategory] = useState("");
  const [newSub, setNewSub] = useState("");

  const [categoryCreating, setCategoryCreating] = useState(false);
  const [subCreating, setSubCreating] = useState(false);

  // Tax & Billing Details (optional)
  const [taxSectionOpen, setTaxSectionOpen] = useState(false);
  const [hsnCode, setHsnCode] = useState("");
  const [gstRate, setGstRate] = useState("");
  const [taxType, setTaxType] = useState<string>("TAXABLE");
  const [baseUnit, setBaseUnit] = useState("");
  const [sellingUnit, setSellingUnit] = useState("");
  const [unitsPerSelling, setUnitsPerSelling] = useState("");
  const [priceIncludesTax, setPriceIncludesTax] = useState(false);

  // HSN suggestion: stop auto-fill after user manually edits HSN
  const [userHasEditedHsn, setUserHasEditedHsn] = useState(false);
  const [hsnSuggestionText, setHsnSuggestionText] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isAutoFillingRef = useRef(false);

  // Debounced HSN suggest: 600ms after name change, call API if name >= 4 chars and user has not edited HSN
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    const trimmed = name.trim();
    if (trimmed.length < 4 || userHasEditedHsn) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const controller = new AbortController();
      abortRef.current = controller;

      suggestHsn(trimmed, controller.signal)
        .then((data) => {
          if (abortRef.current !== controller) return;
          if (data.confidence !== "HIGH" && data.confidence !== "MEDIUM") return;
          if (!data.hsnCode || data.gstRate == null) return;

          isAutoFillingRef.current = true;
          setHsnCode(data.hsnCode);
          setGstRate(String(data.gstRate));
          setTaxType("TAXABLE");
          setHsnSuggestionText(
            data.description != null
              ? `Suggested: ${data.description} (GST ${data.gstRate}%)`
              : `Suggested (GST ${data.gstRate}%)`
          );
          isAutoFillingRef.current = false;
        })
        .catch(() => {
          // Silent: no alerts on API error
        })
        .finally(() => {
          if (abortRef.current === controller) abortRef.current = null;
        });
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [name, userHasEditedHsn]);

  // ✅ Load categories once (and auto select if coming from tree)
  useEffect(() => {
    fetchCategories().then((cats) => {
      setCategories(cats || []);

      if (!productId && presetCategoryId) {
        setCategoryId(presetCategoryId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // Edit mode: load product
  useEffect(() => {
    if (!productId) {
      setInitialLoading(false);
      return;
    }
    let cancelled = false;
    setInitialLoading(true);
    fetchProduct(productId)
      .then((p: Record<string, unknown>) => {
        if (cancelled) return;
        setName(String(p.name ?? ""));
        setPrice(p.price != null ? String(p.price) : "");
        setMrp(p.mrp != null ? String(p.mrp) : "");
        setStock(p.stock != null ? String(p.stock) : "");
        const cid = p.categoryId ? String(p.categoryId) : "";
        setCategoryId(cid);
        setSubcategoryId(p.subcategoryId ? String(p.subcategoryId) : "");
        if (p.hsnCode) setHsnCode(String(p.hsnCode));
        if (p.gstRate != null) setGstRate(String(p.gstRate));
        if (p.taxType) setTaxType(String(p.taxType));
        if (p.baseUnit) setBaseUnit(String(p.baseUnit));
        if (p.sellingUnit) setSellingUnit(String(p.sellingUnit));
        if (p.unitsPerSelling != null) setUnitsPerSelling(String(p.unitsPerSelling));
        setPriceIncludesTax(!!p.priceIncludesTax);
        setUserHasEditedHsn(!!p.hsnCode);
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Could not load product",
            variant: "destructive",
          });
          setLocation("/business");
        }
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, setLocation, toast]);

  // ✅ When category changes => load subcategories & auto select preset
  useEffect(() => {
    if (!categoryId) return;

    fetchSubcategoriesByCategory(categoryId)
      .then((subs) => {
        setSubcategories(subs || []);

        if (!productId && presetSubcategoryId) {
          setSubcategoryId(presetSubcategoryId);
        }
      })
      .catch(() => setSubcategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, productId]);

  async function handleCategoryChange(id: string) {
    setCategoryId(id);
    setSubcategoryId("");
    setSubcategories([]);

    if (!id) return;

    try {
      const data = await fetchSubcategoriesByCategory(id);
      setSubcategories(data || []);
    } catch {
      setSubcategories([]);
    }
  }

  async function handleCreateCategory() {
    if (!newCategory.trim() || categoryCreating) return;

    try {
      setCategoryCreating(true);

      const created = await createCategory(newCategory.trim());

      const updated = await fetchCategories();
      setCategories(updated || []);

      if (created?.id) {
        await handleCategoryChange(created.id);
      }

      toast({
        title: "Category Created",
        description: "Successfully added.",
        className: "bg-green-50 border-green-200 text-green-800",
      });

      setShowCategoryModal(false);
      setNewCategory("");
    } catch (err: any) {
      toast({
        title: "Failed",
        description:
          err?.response?.data?.message ||
          err?.response?.data ||
          err?.message ||
          "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setCategoryCreating(false);
    }
  }

  async function handleCreateSub() {
    if (!newSub.trim() || !categoryId || subCreating) return;

    try {
      setSubCreating(true);

      const created = await createSubcategory({
        categoryId,
        name: newSub.trim(),
      });

      const updated = await fetchSubcategoriesByCategory(categoryId);
      setSubcategories(updated || []);

      if (created?.id) {
        setSubcategoryId(created.id);
      }

      toast({
        title: "Subcategory Created",
        description: "Successfully added.",
        className: "bg-green-50 border-green-200 text-green-800",
      });

      setShowSubModal(false);
      setNewSub("");
    } catch (err: any) {
      toast({
        title: "Failed",
        description:
          err?.response?.data?.message ||
          err?.response?.data ||
          err?.message ||
          "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubCreating(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryId) {
      toast({
        title: "Category required",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name,
        price: Number(price),
        mrp: mrp ? Number(mrp) : undefined,
        stock: stock ? Number(stock) : 0,
        categoryId,
        subcategoryId: subcategoryId || undefined,
      };
      if (hsnCode.trim()) payload.hsnCode = hsnCode.trim();
      if (gstRate !== "") payload.gstRate = Number(gstRate);
      if (taxType) payload.taxType = taxType;
      if (baseUnit.trim()) payload.baseUnit = baseUnit.trim();
      if (sellingUnit.trim()) payload.sellingUnit = sellingUnit.trim();
      if (unitsPerSelling !== "") payload.unitsPerSelling = Number(unitsPerSelling);
      if (priceIncludesTax) payload.priceIncludesTax = true;

      if (productId) {
        await updateProduct(productId, payload);
        toast({
          title: "Product updated",
          description: "Changes saved successfully.",
          className: "bg-green-50 border-green-200 text-green-800",
        });
      } else {
        await createProduct(payload);
        toast({
          title: "Product added",
          description: "Your product has been added successfully.",
          className: "bg-green-50 border-green-200 text-green-800",
        });
      }

      setLocation("/business");
    } catch (err: any) {
      toast({
        title: productId ? "Failed to update product" : "Failed to add product",
        description:
          err?.response?.data?.message ||
          err?.response?.data ||
          err?.message ||
          "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/business")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">
              {productId ? "Edit Product" : "Add Product"}
            </h1>
            <p className="text-sm text-gray-500">
              {productId ? "Update catalog details" : "Add a new item to your catalog"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                placeholder="Product name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              {/* CATEGORY */}
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 h-11 rounded-md border border-gray-200 px-3"
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCategoryModal(true)}
                >
                  + Add
                </Button>
              </div>

              {/* SUBCATEGORY */}
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 h-11 rounded-md border border-gray-200 px-3"
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  disabled={!subcategories.length}
                >
                  <option value="">
                    {subcategories.length ? "Select Subcategory" : "No Subcategories"}
                  </option>

                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <Button
                  type="button"
                  variant="outline"
                  disabled={!categoryId}
                  onClick={() => setShowSubModal(true)}
                >
                  + Add
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                <Input
                  type="number"
                  placeholder="MRP"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                />
              </div>

              <Input
                type="number"
                placeholder="Stock"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />

              <Collapsible open={taxSectionOpen} onOpenChange={setTaxSectionOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full py-2 text-left font-medium text-gray-700 hover:text-gray-900"
                  >
                    {taxSectionOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Tax & Billing Details
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>HSN Code</Label>
                      <Input
                        placeholder="Max 8 characters"
                        value={hsnCode}
                        onChange={(e) => {
                          const val = e.target.value.slice(0, 8);
                          setHsnCode(val);
                          if (!isAutoFillingRef.current) {
                            setUserHasEditedHsn(true);
                            setHsnSuggestionText(null);
                          }
                        }}
                        maxLength={8}
                      />
                      {hsnSuggestionText && (
                        <p className="text-xs text-gray-500">{hsnSuggestionText}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>GST Rate (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={28}
                        step={0.01}
                        placeholder="0–28"
                        value={gstRate}
                        onChange={(e) => setGstRate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Type</Label>
                    <select
                      className="flex w-full h-11 rounded-md border border-gray-200 px-3"
                      value={taxType}
                      onChange={(e) => setTaxType(e.target.value)}
                    >
                      <option value="TAXABLE">Taxable</option>
                      <option value="EXEMPT">Exempt</option>
                      <option value="NIL_RATED">Nil Rated</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Base Unit</Label>
                      <Input
                        placeholder="e.g. NOS, KG, LTR"
                        value={baseUnit}
                        onChange={(e) => setBaseUnit(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Selling Unit</Label>
                      <Input
                        placeholder="e.g. BOX, PKT"
                        value={sellingUnit}
                        onChange={(e) => setSellingUnit(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Units per Selling</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Number"
                      value={unitsPerSelling}
                      onChange={(e) => setUnitsPerSelling(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="priceIncludesTax"
                      checked={priceIncludesTax}
                      onChange={(e) => setPriceIncludesTax(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="priceIncludesTax" className="font-normal cursor-pointer">
                      Price Includes Tax
                    </Label>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setLocation("/business")}>
                  Cancel
                </Button>

                <Button disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : productId ? (
                    "Save changes"
                  ) : (
                    "Add Product"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-[400px] shadow-xl border">
            <h2 className="text-lg font-semibold mb-2">Create Category</h2>
            <p className="text-sm text-gray-500 mb-4">Add a new top-level category</p>

            <Input
              placeholder="Eg: Decorative Lights"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowCategoryModal(false)}
                disabled={categoryCreating}
              >
                Cancel
              </Button>

              <Button disabled={categoryCreating} onClick={handleCreateCategory}>
                {categoryCreating ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SUBCATEGORY MODAL */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-[400px] shadow-xl border">
            <h2 className="text-lg font-semibold mb-2">Create Subcategory</h2>
            <p className="text-sm text-gray-500 mb-4">Linked to selected category</p>

            <Input
              placeholder="Eg: Fairy Lights"
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
            />

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowSubModal(false)}
                disabled={subCreating}
              >
                Cancel
              </Button>

              <Button disabled={subCreating} onClick={handleCreateSub}>
                {subCreating ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
