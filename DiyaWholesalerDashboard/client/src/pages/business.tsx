import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Search,
  Plus,
  Edit2,
  Filter,
  Package,
  Eye,
  Trash2,
  Check,
  X,
  Minus,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  fetchProducts,
  toggleProductVisibility,
  patchProductQuick,
  deleteProduct,
  fetchProductRetailerVisibility,
  saveProductRetailerVisibility,
} from "@/services/product";
import {
  fetchCategories,
  createSubcategory,
  fetchSubcategoriesByCategory,
  fetchChildren,
  renameCategory,
  deleteCategory,
  renameSubcategory,
  deleteSubcategory,
} from "@/services/category";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";



/**
 * FINAL SAFE PRODUCT TYPE
 * Fully aligned with ProductResponseDTO
 */
type Product = {
  id: string;
  name: string;
  sku?: string;
  categoryName?: string;
  price: number;
  mrp?: number;
  stock: number;
  status?: string;
  isActive: boolean;
  visibleToRetailer: boolean;
};

export default function MyBusiness() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [catalogMoveTick, setCatalogMoveTick] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const [mrpEditId, setMrpEditId] = useState<string | null>(null);
  const [mrpDraft, setMrpDraft] = useState("");
  const [mrpSaving, setMrpSaving] = useState(false);

  const [stockEditId, setStockEditId] = useState<string | null>(null);
  const [stockDraft, setStockDraft] = useState("");
  const [stockSaving, setStockSaving] = useState(false);
  const [stockBumpId, setStockBumpId] = useState<string | null>(null);

  const [visProductId, setVisProductId] = useState<string | null>(null);
  const [visRows, setVisRows] = useState<
    { retailerId: string; name: string; visible: boolean }[]
  >([]);
  const [visChecks, setVisChecks] = useState<Record<string, boolean>>({});
  const [visLoading, setVisLoading] = useState(false);
  const [visSaving, setVisSaving] = useState(false);

  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    load();
  }, [page, searchQuery]);

  async function load() {
    try {
      setLoading(true);
      const data = await fetchProducts(page, 20, searchQuery);
      setProducts(data.content || []);
      setSelectedIds({});
    } catch (error) {
      console.error("Failed to load products", error);
    } finally {
      setLoading(false);
    }
  }

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;
  const allOnPageSelected =
    products.length > 0 && products.every((p) => selectedIds[p.id] === true);
  const someOnPageSelected =
    products.some((p) => selectedIds[p.id] === true) && !allOnPageSelected;

  function toggleSelectAllOnPage(next: boolean) {
    const m: Record<string, boolean> = {};
    for (const p of products) {
      m[p.id] = next;
    }
    setSelectedIds(m);
  }

  async function bulkDeleteSelected() {
    const ids = products.filter((p) => selectedIds[p.id]).map((p) => p.id);
    if (ids.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const id of ids) {
        await deleteProduct(id);
      }
      toast({
        title: "Products removed",
        description: `${ids.length} product(s) deleted.`,
        className: "bg-green-50 border-green-200 text-green-800",
      });
      setSelectedIds({});
      await load();
    } catch {
      toast({ title: "Bulk delete failed", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  }

  const handleToggleVisibility = async (
    productId: string,
    visible: boolean
  ) => {
    try {
      await toggleProductVisibility(productId, visible);
      load();
    } catch (error) {
      console.error("Failed to toggle visibility", error);
      toast({
        title: "Update failed",
        variant: "destructive",
      });
    }
  };

  async function openVisibilityModal(productId: string) {
    setVisProductId(productId);
    setVisLoading(true);
    setVisRows([]);
    try {
      const rows = await fetchProductRetailerVisibility(productId);
      setVisRows(rows);
      const m: Record<string, boolean> = {};
      rows.forEach((r) => {
        m[r.retailerId] = r.visible;
      });
      setVisChecks(m);
    } catch {
      toast({ title: "Could not load retailers", variant: "destructive" });
      setVisProductId(null);
    } finally {
      setVisLoading(false);
    }
  }

  async function saveVisibilityModal() {
    if (!visProductId) return;
    const hidden = visRows
      .filter((r) => !visChecks[r.retailerId])
      .map((r) => r.retailerId);
    setVisSaving(true);
    try {
      await saveProductRetailerVisibility(visProductId, hidden);
      toast({
        title: "Visibility saved",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      setVisProductId(null);
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setVisSaving(false);
    }
  }

  async function saveMrp(productId: string) {
    const v = parseFloat(mrpDraft);
    if (Number.isNaN(v) || v < 0) {
      toast({ title: "Enter a valid MRP", variant: "destructive" });
      return;
    }
    setMrpSaving(true);
    try {
      await patchProductQuick(productId, { mrp: v });
      setMrpEditId(null);
      load();
    } catch {
      toast({ title: "Could not update MRP", variant: "destructive" });
    } finally {
      setMrpSaving(false);
    }
  }

  async function saveStock(productId: string) {
    const v = parseInt(stockDraft, 10);
    if (Number.isNaN(v) || v < 0) {
      toast({ title: "Enter a valid stock count", variant: "destructive" });
      return;
    }
    setStockSaving(true);
    try {
      await patchProductQuick(productId, { stock: v });
      setStockEditId(null);
      load();
    } catch {
      toast({ title: "Could not update stock", variant: "destructive" });
    } finally {
      setStockSaving(false);
    }
  }

  async function bumpStock(productId: string, current: number, delta: number) {
    const next = Math.max(0, current + delta);
    setStockBumpId(productId);
    try {
      await patchProductQuick(productId, { stock: next });
      load();
    } catch {
      toast({ title: "Could not update stock", variant: "destructive" });
    } finally {
      setStockBumpId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteProductId) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(deleteProductId);
      toast({
        title: "Product removed",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      setDeleteProductId(null);
      load();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Product Management
          </h1>
          <p className="text-sm text-gray-500">
            Manage your catalog, pricing, and inventory.
          </p>
        </div>
        <Button
          className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm"
          onClick={() => setLocation("/products/new")}
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="w-full justify-start bg-white border border-gray-200 rounded-xl p-1 mb-6 h-auto">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="info">Business Info</TabsTrigger>
        </TabsList>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="space-y-4 mt-0">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                className="pl-10 bg-gray-50 border-gray-200 w-full"
                value={searchQuery}
                onChange={(e) => {
                  setPage(0);
                  setSearchQuery(e.target.value);
                }}
              />
            </div>
            <Button variant="outline" className="gap-2 bg-white">
              <Filter className="h-4 w-4" />
              Filter Category
            </Button>
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{selectedCount}</span> selected
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="text-gray-700"
                  onClick={() => setSelectedIds({})}
                  disabled={deleteLoading}
                >
                  Clear
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={bulkDeleteSelected}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting…
                    </>
                  ) : (
                    "Bulk Delete"
                  )}
                </Button>
              </div>
            </div>
          )}

          <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[44px]">
                    <Checkbox
                      checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => toggleSelectAllOnPage(v === true)}
                      aria-label="Select all products on page"
                    />
                  </TableHead>
                  <TableHead className="w-[300px]">Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500">
                      Loading products…
                    </TableCell>
                  </TableRow>
                )}

                {!loading && products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500">
                      No products found.
                    </TableCell>
                  </TableRow>
                )}

                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds[product.id] === true}
                        onCheckedChange={(v) =>
                          setSelectedIds((prev) => ({ ...prev, [product.id]: v === true }))
                        }
                        aria-label={`Select ${product.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            SKU: {product.sku || product.id}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary">
                        {product.categoryName || "Uncategorized"}
                      </Badge>
                    </TableCell>

                    <TableCell className="align-middle">
                      {mrpEditId === product.id ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-gray-500 text-sm">₹</span>
                          <Input
                            className="h-8 w-20 bg-white border-gray-200"
                            type="number"
                            min={0}
                            step={0.01}
                            value={mrpDraft}
                            onChange={(e) => setMrpDraft(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveMrp(product.id);
                              if (e.key === "Escape") setMrpEditId(null);
                            }}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600"
                            disabled={mrpSaving}
                            onClick={() => saveMrp(product.id)}
                          >
                            {mrpSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={mrpSaving}
                            onClick={() => setMrpEditId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="text-left font-medium text-gray-900 hover:text-primary hover:underline underline-offset-2"
                          onClick={() => {
                            setMrpEditId(product.id);
                            setMrpDraft(
                              product.mrp != null ? String(product.mrp) : ""
                            );
                          }}
                        >
                          {product.mrp != null ? `₹${product.mrp}` : "—"}
                        </button>
                      )}
                    </TableCell>

                    <TableCell className="align-middle">
                      {stockEditId === product.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            className="h-8 w-16 bg-white border-gray-200"
                            type="number"
                            min={0}
                            value={stockDraft}
                            onChange={(e) => setStockDraft(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveStock(product.id);
                              if (e.key === "Escape") setStockEditId(null);
                            }}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600"
                            disabled={stockSaving}
                            onClick={() => saveStock(product.id)}
                          >
                            {stockSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={stockSaving}
                            onClick={() => setStockEditId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-start">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 shrink-0 border-gray-200"
                            disabled={stockBumpId === product.id}
                            onClick={() =>
                              bumpStock(
                                product.id,
                                product.stock ?? 0,
                                -1
                              )
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <button
                            type="button"
                            className="min-w-[2rem] text-center text-sm font-medium tabular-nums hover:text-primary"
                            onClick={() => {
                              setStockEditId(product.id);
                              setStockDraft(String(product.stock ?? 0));
                            }}
                          >
                            {stockBumpId === product.id ? (
                              <Loader2 className="h-4 w-4 animate-spin inline" />
                            ) : (
                              product.stock ?? 0
                            )}
                          </button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 shrink-0 border-gray-200"
                            disabled={stockBumpId === product.id}
                            onClick={() =>
                              bumpStock(
                                product.id,
                                product.stock ?? 0,
                                1
                              )
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <StatusBadge
                        status={
                          product.status ||
                          (product.stock > 0 ? "In Stock" : "Out of Stock")
                        }
                      />
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1 flex-wrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-600"
                          title="Who can see this product"
                          onClick={() => openVisibilityModal(product.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-600"
                          title="Edit product"
                          onClick={() =>
                            setLocation(`/products/edit/${product.id}`)
                          }
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-600 hover:text-red-600"
                          title="Delete product"
                          onClick={() => setDeleteProductId(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div
                          className="flex items-center gap-1.5 pl-1 border-l border-gray-200 ml-0.5"
                          title="Visible to all retailers (catalog)"
                        >
                          <span className="text-xs text-gray-500 hidden sm:inline max-w-[4rem] leading-tight text-right">
                            Global
                          </span>
                          <Switch
                            checked={!!product.visibleToRetailer}
                            onCheckedChange={(val) =>
                              handleToggleVisibility(product.id, val)
                            }
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* STUB TABS */}
        <TabsContent value="categories" className="space-y-4 mt-0">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Your Categories</span>

                <Button
                  className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm"
                  onClick={() => setLocation("/categories")}
                >
                  + Manage Categories
                </Button>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {!categories?.length && (
                <div className="text-center text-gray-500 py-6">
                  No categories created yet.
                </div>
              )}

              <div className="space-y-2">
                {categories?.map((cat) => (
                  <TreeNode
                    key={cat.id}
                    id={cat.id}
                    name={cat.name}
                    level={0}
                    categoryRootId={cat.id}
                    refreshTick={catalogMoveTick}
                    onProductMoved={() => setCatalogMoveTick((x) => x + 1)}
                  />
                ))}

              </div>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="info">
          <div className="p-12 text-center border-2 border-dashed">
            Business details management coming soon.
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!visProductId}
        onOpenChange={(open) => !open && setVisProductId(null)}
      >
        <DialogContent className="sm:max-w-md bg-white border-gray-200 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Retailer visibility</DialogTitle>
            <p className="text-sm text-gray-500">
              Checked retailers can see this product in their catalog (when global
              visibility is on).
            </p>
          </DialogHeader>
          <div className="max-h-[320px] overflow-y-auto space-y-2 py-2">
            {visLoading && (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            )}
            {!visLoading && visRows.length === 0 && (
              <p className="text-sm text-gray-500">
                No connected retailers yet. Approve connections to manage
                visibility per retailer.
              </p>
            )}
            {!visLoading &&
              visRows.map((r) => (
                <label
                  key={r.retailerId}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox
                    checked={!!visChecks[r.retailerId]}
                    onCheckedChange={(c) =>
                      setVisChecks((prev) => ({
                        ...prev,
                        [r.retailerId]: c === true,
                      }))
                    }
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {r.name}
                  </span>
                </label>
              ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setVisProductId(null)}
              disabled={visSaving}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={saveVisibilityModal}
              disabled={visLoading || visSaving || visRows.length === 0}
            >
              {visSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteProductId}
        onOpenChange={(open) => !open && !deleteLoading && setDeleteProductId(null)}
      >
        <AlertDialogContent className="bg-white border-gray-200 rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteLoading}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {deleteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "In Stock")
    return (
      <Badge className="bg-green-50 text-green-700 border-green-200">
        In Stock
      </Badge>
    );

  if (status === "Low Stock")
    return (
      <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 animate-pulse">
        Low Stock
      </Badge>
    );

  return (
    <Badge className="bg-red-50 text-red-700 border-red-200">
      Out of Stock
    </Badge>
  );
}
function TreeNode({
  id,
  name,
  level = 0,
  parentId,
  categoryRootId,
  onRefreshParent,
  refreshTick,
  onProductMoved,
}: {
  id: string;
  name: string;
  level?: number;
  parentId?: string;
  categoryRootId?: string;
  onRefreshParent?: () => Promise<void>;
  refreshTick?: number;
  onProductMoved?: () => void;
}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [newInsideName, setNewInsideName] = useState("");
  const [addingInside, setAddingInside] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [newBesideName, setNewBesideName] = useState("");
  const [addingBeside, setAddingBeside] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState(name);
  const [renameSaving, setRenameSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [dragOver, setDragOver] = useState(false);

  async function loadChildren() {
    try {
      const data =
        level === 0
          ? await fetchSubcategoriesByCategory(id)
          : await fetchChildren(id);

      setChildren(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load children", e);
      setChildren([]); // ✅ never crash
    }
  }

  async function loadProducts() {
    setProductsLoading(true);
    try {
      const res =
        level === 0
          ? await fetchProducts(0, 50, undefined, id, undefined)
          : await fetchProducts(0, 50, undefined, undefined, id);
      setProducts(res?.content || []);
    } catch (e) {
      console.error(e);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    // When a product is moved, refresh all currently open nodes so it disappears from the source immediately.
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  async function handleDropProduct(productId: string) {
    try {
      const patch: any = {};
      if (level === 0) {
        patch.categoryId = id;
        patch.subcategoryId = null;
      } else {
        patch.categoryId = categoryRootId!;
        patch.subcategoryId = id;
      }
      await patchProductQuick(productId, patch);
      toast({
        title: "Product moved",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      await loadProducts();
      onProductMoved?.();
    } catch (e: any) {
      toast({
        title: "Could not move product",
        description: e?.response?.data?.message || e?.message || "Try again",
        variant: "destructive",
      });
    }
  }

  async function toggleNode() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);

    try {
      setLoading(true);
      await loadChildren();
      await loadProducts();
    } finally {
      setLoading(false);
    }
  }

  async function addInside() {
    if (!newInsideName.trim()) return;

    try {
      setAddingInside(true);

      if (level === 0) {
        await createSubcategory({ categoryId: id, name: newInsideName.trim() });
      } else {
        await createSubcategory({ parentSubId: id, name: newInsideName.trim() });
      }

      setNewInsideName("");
      setOpen(true);
      await loadChildren();
    } finally {
      setAddingInside(false);
    }
  }

  async function addBeside() {
    if (!newBesideName.trim()) return;
    if (level === 0) return;

    try {
      setAddingBeside(true);

      if (level === 1) {
        // sibling of top-level -> create under category
        await createSubcategory({
          categoryId: categoryRootId!,
          name: newBesideName.trim(),
        });

        // ✅ IMPORTANT: refresh parent (category root node)
        if (onRefreshParent) await onRefreshParent();
      } else {
        // sibling of deeper node -> create under parent subcategory
        await createSubcategory({
          parentSubId: parentId!,
          name: newBesideName.trim(),
        });

        // ✅ IMPORTANT: refresh parent node list
        if (onRefreshParent) await onRefreshParent();
      }

      setNewBesideName("");
      setMenuOpen(false);
    } finally {
      setAddingBeside(false);
    }
  }

  function goToAddProductHere() {
    if (level === 0) {
      setLocation(`/products/new?categoryId=${id}`);
    } else {
      setLocation(
        `/products/new?categoryId=${categoryRootId}&subcategoryId=${id}`
      );
    }
  }

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      {/* HEADER */}
      <div
        className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 ${dragOver ? "bg-orange-50" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const pid = e.dataTransfer.getData("text/plain");
          if (pid) handleDropProduct(pid);
        }}
        title="Drop product here to move"
      >
        <div
          className="flex items-center gap-2 cursor-pointer flex-1"
          onClick={() => toggleNode()}
        >
          <span className="text-gray-400 text-sm">{open ? "▾" : "▸"}</span>
          <span className="font-medium capitalize text-gray-900">{name}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-gray-600 hover:text-gray-900"
            title="Rename"
            onClick={(e) => {
              e.stopPropagation();
              setRenameDraft(name);
              setRenameOpen(true);
            }}
          >
            ✏️
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-gray-600 hover:text-red-600"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteOpen(true);
            }}
          >
            🗑️
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={(e) => {
              e.stopPropagation();
              goToAddProductHere();
            }}
          >
            + Product
          </Button>

          {level > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
            >
              ⋮
            </Button>
          )}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4">
          {/* PRODUCTS */}
          <div className="mt-3 rounded-lg bg-gray-50 border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                Products{" "}
                <span className="text-xs font-normal text-gray-500">
                  {productsLoading ? "" : `(${products.length})`}
                </span>
              </p>
            </div>

            {productsLoading && (
              <p className="text-xs text-gray-400 mt-2">Loading…</p>
            )}

            {!productsLoading && products.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">
                No products added yet.
              </p>
            )}

            {!productsLoading && products.length > 0 && (
              <div className="mt-2 space-y-1">
                {products.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex justify-between text-sm bg-white border rounded px-3 py-2"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(p.id));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <span className="font-medium flex items-center gap-2">
                      <span className="text-gray-400 cursor-grab select-none" title="Drag to move">
                        ⋮⋮
                      </span>
                      {p.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      Stock: {p.stock ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CHILDREN */}
          <div className="mt-3 space-y-2">
            {loading && <p className="text-sm text-gray-400">Loading…</p>}

            {!loading && !children.length && (
              <p className="text-sm text-gray-400">No subcategories</p>
            )}

            {Array.isArray(children) && children.map((child) => (
              <div key={child.id} className="ml-4 border-l pl-4">
                <TreeNode
                  id={child.id}
                  name={child.name}
                  level={level + 1}
                  parentId={id}
                  categoryRootId={level === 0 ? id : categoryRootId}
                  refreshTick={refreshTick}
                  onProductMoved={onProductMoved}
                  onRefreshParent={async () => {
                    // ✅ refresh THIS node's children
                    await loadChildren();
                  }}
                />
              </div>
            ))}
          </div>

          {/* ADD INSIDE */}
          <div
            className="mt-4 flex gap-2 items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              placeholder="Add subcategory…"
              value={newInsideName}
              onChange={(e) => setNewInsideName(e.target.value)}
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addInside();
                }
              }}
            />

            <Button
              className="h-10 px-4"
              disabled={addingInside}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addInside();
              }}
            >
              {addingInside ? "Adding…" : "+ Add"}
            </Button>
          </div>

          {/* MENU: ADD BESIDE */}
          {menuOpen && level > 0 && (
            <div
              className="mt-3 rounded-lg border bg-white p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-semibold mb-2">Add same level</p>

              <div className="flex gap-2">
                <Input
                  placeholder="New name…"
                  value={newBesideName}
                  onChange={(e) => setNewBesideName(e.target.value)}
                  className="h-10"
                />
                <Button
                  variant="outline"
                  className="h-10 px-4"
                  disabled={addingBeside}
                  onClick={(e) => {
                    e.stopPropagation();
                    addBeside();
                  }}
                >
                  {addingBeside ? "Adding…" : "Add"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md bg-white border-gray-200 rounded-xl">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} />
            <p className="text-xs text-gray-500">This updates what retailers see in the catalog.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={renameSaving}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={renameSaving || !renameDraft.trim()}
              onClick={async () => {
                try {
                  setRenameSaving(true);
                  if (level === 0) {
                    await renameCategory(id, renameDraft.trim());
                  } else {
                    await renameSubcategory(id, renameDraft.trim());
                  }
                  toast({
                    title: "Renamed",
                    className: "bg-green-50 border-green-200 text-green-800",
                  });
                  setRenameOpen(false);
                  // best-effort refresh: reload page categories list by reloading window
                  window.location.reload();
                } catch (e: any) {
                  toast({
                    title: "Rename failed",
                    description: e?.response?.data?.message || e?.message || "Try again",
                    variant: "destructive",
                  });
                } finally {
                  setRenameSaving(false);
                }
              }}
            >
              {renameSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-white border-gray-200 rounded-xl">
          <DialogHeader>
            <DialogTitle>Delete?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This can be deleted only if it has no products (and no children).
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteSaving}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteSaving}
              onClick={async () => {
                try {
                  setDeleteSaving(true);
                  if (level === 0) {
                    await deleteCategory(id);
                  } else {
                    await deleteSubcategory(id);
                  }
                  toast({
                    title: "Deleted",
                    className: "bg-green-50 border-green-200 text-green-800",
                  });
                  setDeleteOpen(false);
                  window.location.reload();
                } catch (e: any) {
                  toast({
                    title: "Delete failed",
                    description: e?.response?.data?.message || e?.message || "Try again",
                    variant: "destructive",
                  });
                } finally {
                  setDeleteSaving(false);
                }
              }}
            >
              {deleteSaving ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
//original file ends here





