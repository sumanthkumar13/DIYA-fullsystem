import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ChevronLeft, Folder, Tag, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fetchCategoryTree, fetchChildren, fetchSubcategoriesByCategory } from "@/services/category";
import { fetchProducts } from "@/services/product";

type CategoryNode = { id: string; name: string; subcategories?: Array<{ id: string; name: string }> };
type SubcategoryNode = { id: string; name: string; categoryId?: string | null; parentId?: string | null };
type ProductNode = { id: string; name: string; sku?: string | null; categoryName?: string | null; subcategoryName?: string | null };

type SearchResult =
  | { kind: "product"; product: ProductNode }
  | { kind: "category"; id: string; name: string }
  | { kind: "subcategory"; id: string; name: string; categoryId?: string | null; parentId?: string | null };

export type ProductPickerValue = { productId: string; productLabel: string };

type Props = {
  value?: ProductPickerValue | null;
  placeholder?: string;
  onPick: (picked: ProductPickerValue) => void;
};

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

export function ProductPicker({ value, placeholder, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // category navigation state
  const [path, setPath] = useState<Array<{ label: string; type: "root" | "category" | "subcategory"; id?: string }>>([
    { label: "Categories", type: "root" },
  ]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [subcats, setSubcats] = useState<SubcategoryNode[]>([]);
  const [products, setProducts] = useState<ProductNode[]>([]);

  // search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const searchMode = query.trim().length > 0;

  // close on outside click
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  // load top-level categories on first open
  useEffect(() => {
    let active = true;
    if (!open) return;
    if (categories.length > 0) return;
    setLoading(true);
    fetchCategoryTree()
      .then((tree) => {
        if (!active) return;
        const mapped = (Array.isArray(tree) ? tree : []).map((c: any) => ({
          id: String(c.id),
          name: String(c.name ?? ""),
          subcategories: Array.isArray(c.subcategories)
            ? c.subcategories.map((s: any) => ({ id: String(s.id), name: String(s.name ?? "") }))
            : [],
        }));
        setCategories(mapped);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, categories.length]);

  const current = path[path.length - 1];

  const goRoot = () => {
    setPath([{ label: "Categories", type: "root" }]);
    setSubcats([]);
    setProducts([]);
  };

  const openCategory = async (cat: CategoryNode) => {
    setLoading(true);
    setProducts([]);
    setSubcats([]);
    setPath([{ label: "Categories", type: "root" }, { label: cat.name, type: "category", id: cat.id }]);
    try {
      // Fetch direct products under category (subcategory = null)
      const productPage = await fetchProducts(0, 20, undefined, cat.id);
      const productList = Array.isArray(productPage?.content) ? productPage.content : Array.isArray(productPage) ? productPage : [];
      setProducts(
        productList
          .filter((p: any) => !p.subcategoryId)
          .map((p: any) => ({
            id: String(p.id),
            name: String(p.name ?? ""),
            sku: p.sku ?? null,
            categoryName: p.categoryName ?? null,
            subcategoryName: p.subcategoryName ?? null,
          }))
      );

      // Prefer tree-provided subcats; if empty, fetch
      const fromTree = cat.subcategories ?? [];
      const list = fromTree.length > 0 ? fromTree : await fetchSubcategoriesByCategory(cat.id);
      setSubcats(
        (Array.isArray(list) ? list : []).map((s: any) => ({
          id: String(s.id),
          name: String(s.name ?? ""),
          categoryId: s.categoryId ? String(s.categoryId) : cat.id,
          parentId: s.parentId ? String(s.parentId) : null,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const openSubcategory = async (sub: SubcategoryNode) => {
    setLoading(true);
    setProducts([]);
    setSubcats([]);
    setPath((prev) => [...prev, { label: sub.name, type: "subcategory", id: sub.id }]);
    try {
      const children = await fetchChildren(sub.id);
      const childList = Array.isArray(children) ? children : [];
      setSubcats(
        childList.map((s: any) => ({
          id: String(s.id),
          name: String(s.name ?? ""),
          categoryId: s.categoryId ? String(s.categoryId) : sub.categoryId ?? null,
          parentId: s.parentId ? String(s.parentId) : sub.id,
        }))
      );

      // Load products for this subcategory (lazy, small page)
      const page = await fetchProducts(0, 20, undefined, undefined, sub.id);
      const content = Array.isArray(page?.content) ? page.content : Array.isArray(page) ? page : [];
      setProducts(
        content.map((p: any) => ({
          id: String(p.id),
          name: String(p.name ?? ""),
          sku: p.sku ?? null,
          categoryName: p.categoryName ?? null,
          subcategoryName: p.subcategoryName ?? null,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const goBack = async () => {
    if (path.length <= 1) return;
    const nextPath = path.slice(0, -1);
    setPath(nextPath);
    setProducts([]);
    setSubcats([]);
    setLoading(true);
    try {
      const next = nextPath[nextPath.length - 1];
      if (next.type === "root") {
        // nothing else needed
        return;
      }
      if (next.type === "category" && next.id) {
        const cat = categories.find((c) => c.id === next.id);
        if (cat) {
          // load direct products under category (subcategory=null)
          const productPage = await fetchProducts(0, 20, undefined, cat.id);
          const productList = Array.isArray(productPage?.content)
            ? productPage.content
            : Array.isArray(productPage)
            ? productPage
            : [];
          setProducts(
            productList
              .filter((p: any) => !p.subcategoryId)
              .map((p: any) => ({
                id: String(p.id),
                name: String(p.name ?? ""),
                sku: p.sku ?? null,
                categoryName: p.categoryName ?? null,
                subcategoryName: p.subcategoryName ?? null,
              }))
          );

          const fromTree = cat.subcategories ?? [];
          const list = fromTree.length > 0 ? fromTree : await fetchSubcategoriesByCategory(cat.id);
          setSubcats(
            (Array.isArray(list) ? list : []).map((s: any) => ({
              id: String(s.id),
              name: String(s.name ?? ""),
              categoryId: s.categoryId ? String(s.categoryId) : cat.id,
              parentId: s.parentId ? String(s.parentId) : null,
            }))
          );
        }
        return;
      }
      if (next.type === "subcategory" && next.id) {
        const children = await fetchChildren(next.id);
        const childList = Array.isArray(children) ? children : [];
        setSubcats(
          childList.map((s: any) => ({
            id: String(s.id),
            name: String(s.name ?? ""),
            categoryId: s.categoryId ? String(s.categoryId) : null,
            parentId: s.parentId ? String(s.parentId) : next.id,
          }))
        );

        const page = await fetchProducts(0, 20, undefined, undefined, next.id);
        const content = Array.isArray(page?.content) ? page.content : Array.isArray(page) ? page : [];
        setProducts(
          content.map((p: any) => ({
            id: String(p.id),
            name: String(p.name ?? ""),
            sku: p.sku ?? null,
            categoryName: p.categoryName ?? null,
            subcategoryName: p.subcategoryName ?? null,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Smart search: products + categories + subcategories, debounced
  useEffect(() => {
    let active = true;
    if (!open) return;
    if (!searchMode) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const q = query.trim();
        // 1) products search (top 12)
        const page = await fetchProducts(0, 12, q);
        const content = Array.isArray(page?.content) ? page.content : Array.isArray(page) ? page : [];
        const productHits: SearchResult[] = content.map((p: any) => ({
          kind: "product",
          product: {
            id: String(p.id),
            name: String(p.name ?? ""),
            sku: p.sku ?? null,
            categoryName: p.categoryName ?? null,
            subcategoryName: p.subcategoryName ?? null,
          },
        }));

        // 2) category/subcategory hits from already-loaded tree (fast, local)
        const nq = normalize(q);
        const catHits: SearchResult[] = categories
          .filter((c) => normalize(c.name).includes(nq))
          .slice(0, 6)
          .map((c) => ({ kind: "category", id: c.id, name: c.name }));

        const subHits: SearchResult[] = categories
          .flatMap((c) => (c.subcategories ?? []).map((s) => ({ ...s, categoryId: c.id })))
          .filter((s) => normalize(s.name).includes(nq))
          .slice(0, 6)
          .map((s) => ({ kind: "subcategory", id: s.id, name: s.name, categoryId: s.categoryId }));

        // basic relevance ordering: product hits first; then categories; then subcats
        const combined = [...productHits, ...catHits, ...subHits].slice(0, 15);
        if (!active) return;
        setSearchResults(combined);
      } catch {
        if (!active) return;
        setSearchResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [open, query, searchMode, categories]);

  const displayLabel = value?.productLabel ?? selectedLabel;

  useEffect(() => {
    if (value?.productLabel) {
      setSelectedLabel(value.productLabel);
    }
  }, [value?.productLabel]);

  const dropdownTitle = useMemo(() => {
    if (searchMode) return "Search results";
    if (path.length <= 1) return "Categories";
    return current.label;
  }, [searchMode, path.length, current.label]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        placeholder={placeholder ?? "Search product or category..."}
        value={open ? query : displayLabel}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
      />

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-white shadow-md">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              {path.length > 1 && !searchMode ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={goBack}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <span>{dropdownTitle}</span>
              )}
            </div>
            {!searchMode && path.length > 1 && (
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-gray-800"
                onMouseDown={(e) => e.preventDefault()}
                onClick={goRoot}
              >
                Root
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-auto py-1">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : searchMode ? (
              searchResults.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
              ) : (
                searchResults.map((r, idx) => {
                  if (r.kind === "product") {
                    const label = r.product.name;
                    const meta = [r.product.subcategoryName, r.product.categoryName].filter(Boolean).join(" • ");
                    return (
                      <button
                        key={`p-${r.product.id}-${idx}`}
                        type="button"
                        className={cn(
                          "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-100"
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onPick({ productId: r.product.id, productLabel: label });
                          setSelectedLabel(label);
                          setQuery(label);
                          setOpen(false);
                        }}
                      >
                        <Package className="mt-0.5 h-4 w-4 text-gray-400" />
                        <span className="flex-1">
                          <span className="font-medium">{label}</span>
                          {meta ? <div className="text-xs text-gray-500">{meta}</div> : null}
                        </span>
                      </button>
                    );
                  }
                  if (r.kind === "category") {
                    return (
                      <button
                        key={`c-${r.id}-${idx}`}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-100"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const cat = categories.find((c) => c.id === r.id);
                          if (cat) {
                            setQuery("");
                            openCategory(cat);
                          }
                        }}
                      >
                        <Folder className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">Category: {r.name}</span>
                      </button>
                    );
                  }
                  // subcategory
                  return (
                    <button
                      key={`s-${r.id}-${idx}`}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-100"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQuery("");
                        // jump into category then open subcategory
                        const catId = r.categoryId ? String(r.categoryId) : undefined;
                        const cat = catId ? categories.find((c) => c.id === catId) : undefined;
                        if (cat) {
                          openCategory(cat).then(() => openSubcategory({ id: r.id, name: r.name, categoryId: catId }));
                        } else {
                          openSubcategory({ id: r.id, name: r.name });
                        }
                      }}
                    >
                      <Tag className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Subcategory: {r.name}</span>
                    </button>
                  );
                })
              )
            ) : path.length <= 1 ? (
              categories.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No categories</div>
              ) : (
                categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openCategory(c)}
                  >
                    <Folder className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{c.name}</span>
                  </button>
                ))
              )
            ) : (products.length > 0 || subcats.length > 0) ? (
              <>
                {products.length > 0 && (
                  <div className="space-y-1">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-100"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onPick({ productId: p.id, productLabel: p.name });
                          setSelectedLabel(p.name);
                          setQuery(p.name);
                          setOpen(false);
                        }}
                      >
                        <Package className="mt-0.5 h-4 w-4 text-gray-400" />
                        <span className="flex-1">
                          <span className="font-medium">{p.name}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {subcats.length > 0 && (
                  <div className="space-y-1">
                    {subcats.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-100"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => openSubcategory(s)}
                      >
                        <Tag className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">No items</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

