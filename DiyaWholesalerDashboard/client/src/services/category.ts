import api from "@/lib/axios";

export async function fetchCategories() {
  const res = await api.get("/wholesaler/categories");
  return res.data;
}

export async function createCategory(name: string) {
  const res = await api.post("/wholesaler/categories", { name });
  return res.data;
}

export async function fetchCategoryTree() {
  const res = await api.get("/wholesaler/categories/tree");
  return res.data;
}

/**
 * ✅ Backend supports:
 * GET /wholesaler/subcategories/category/{categoryId}
 * GET /wholesaler/subcategories/children/{parentId}
 */
export async function fetchSubcategoriesByCategory(categoryId: string) {
  const res = await api.get(`/wholesaler/subcategories/category/${categoryId}`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchChildren(parentId: string) {
  const res = await api.get(`/wholesaler/subcategories/children/${parentId}`);
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * ✅ Create subcategory:
 * - top-level: provide categoryId
 * - child: provide parentSubId (backend will infer category from parent)
 */
export async function createSubcategory(params: {
  name: string;
  categoryId?: string;
  parentSubId?: string;
}) {
  if (!params?.name?.trim()) {
    throw new Error("Subcategory name is required");
  }

  const hasCategory = !!params.categoryId;
  const hasParent = !!params.parentSubId;

  if (hasCategory === hasParent) {
    throw new Error("Provide exactly one: categoryId or parentSubId");
  }

  const res = await api.post(`/wholesaler/subcategories`, {
    ...params,
    name: params.name.trim(),
  });

  return res.data;
}

