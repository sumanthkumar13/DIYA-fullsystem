import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createProduct } from "@/services/product";
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

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  const [newCategory, setNewCategory] = useState("");
  const [newSub, setNewSub] = useState("");

  const [categoryCreating, setCategoryCreating] = useState(false);
  const [subCreating, setSubCreating] = useState(false);

  // ✅ Load categories once (and auto select if coming from tree)
  useEffect(() => {
    fetchCategories().then((cats) => {
      setCategories(cats || []);

      if (presetCategoryId) {
        setCategoryId(presetCategoryId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ When category changes => load subcategories & auto select preset
  useEffect(() => {
    if (!categoryId) return;

    fetchSubcategoriesByCategory(categoryId)
      .then((subs) => {
        setSubcategories(subs || []);

        if (presetSubcategoryId) {
          setSubcategoryId(presetSubcategoryId);
        }
      })
      .catch(() => setSubcategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

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
      await createProduct({
        name,
        price: Number(price),
        mrp: mrp ? Number(mrp) : undefined,
        stock: stock ? Number(stock) : 0,
        categoryId,
        subcategoryId: subcategoryId || undefined,
      });

      toast({
        title: "Product added",
        description: "Your product has been added successfully.",
        className: "bg-green-50 border-green-200 text-green-800",
      });

      setLocation("/business");
    } catch (err: any) {
      toast({
        title: "Failed to add product",
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
            <h1 className="text-2xl font-display font-bold">Add Product</h1>
            <p className="text-sm text-gray-500">Add a new item to your catalog</p>
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
