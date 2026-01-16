import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Search,
  Plus,
  Edit2,
  Filter,
  Package,
  Eye,
  EyeOff,
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
  toggleProductActive,
  toggleProductVisibility,
} from "@/services/product";
import {
  fetchCategories,
  createSubcategory,
  fetchSubcategoriesByCategory,
  fetchChildren,
} from "@/services/category";



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
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

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
    } catch (error) {
      console.error("Failed to load products", error);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleActive = async (productId: string, active: boolean) => {
    try {
      await toggleProductActive(productId, active);
      load(); // always re-sync with backend truth
    } catch (error) {
      console.error("Failed to toggle active status", error);
    }
  };

  const handleToggleVisibility = async (
    productId: string,
    visible: boolean
  ) => {
    try {
      await toggleProductVisibility(productId, visible);
      load();
    } catch (error) {
      console.error("Failed to toggle visibility", error);
    }
  };

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

          <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[300px]">Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      Loading products…
                    </TableCell>
                  </TableRow>
                )}

                {!loading && products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No products found.
                    </TableCell>
                  </TableRow>
                )}

                {products.map((product) => (
                  <TableRow key={product.id}>
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

                    <TableCell>
                      <div>₹{product.price}</div>
                      {product.mrp && (
                        <div className="text-xs text-gray-400 line-through">
                          ₹{product.mrp}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>{product.stock}</TableCell>

                    <TableCell>
                      <StatusBadge
                        status={
                          product.status ||
                          (product.stock > 0 ? "In Stock" : "Out of Stock")
                        }
                      />
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleToggleVisibility(
                              product.id,
                              !product.visibleToRetailer
                            )
                          }
                        >
                          {product.visibleToRetailer ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>

                        <Button variant="ghost" size="icon">
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        <Switch
                          checked={product.isActive}
                          onCheckedChange={(val) =>
                            handleToggleActive(product.id, val)
                          }
                        />
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
}: {
  id: string;
  name: string;
  level?: number;
  parentId?: string;
  categoryRootId?: string;
  onRefreshParent?: () => Promise<void>;
}) {
  const [, setLocation] = useLocation();

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
    if (level <= 0) return;
    setProductsLoading(true);
    try {
      const res = await fetchProducts(0, 50, undefined, undefined, id);
      setProducts(res?.content || []);
    } catch (e) {
      console.error(e);
      setProducts([]);
    } finally {
      setProductsLoading(false);
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
    if (level <= 0) return;
    setLocation(
      `/products/new?categoryId=${categoryRootId}&subcategoryId=${id}`
    );
  }

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
        <div
          className="flex items-center gap-2 cursor-pointer flex-1"
          onClick={() => toggleNode()}
        >
          <span className="text-gray-400 text-sm">{open ? "▾" : "▸"}</span>
          <span className="font-medium capitalize text-gray-900">{name}</span>
        </div>

        <div className="flex items-center gap-2">
          {level > 0 && (
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
          )}

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
          {level > 0 && (
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
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-gray-500">
                        Stock: {p.stock ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
    </div>
  );
}
//original file ends here





