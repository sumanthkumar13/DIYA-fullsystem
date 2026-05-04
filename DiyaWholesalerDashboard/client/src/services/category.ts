import api from "@/lib/axios";

export async function fetchCategories() {
  const res = await api.get("/wholesaler/categories");
  return res.data;
}

/**
 * Public category list for signup / onboarding (no auth required)
 */
export async function fetchPublicCategories() {
  const res = await api.get("/public/categories");
  return res.data;
}

export async function createCategory(name: string) {
  const res = await api.post("/wholesaler/categories", { name });
  return res.data;
}

export async function createCategoryWithImage(name: string, imageUrl?: string | null) {
  const res = await api.post("/wholesaler/categories", {
    name,
    imageUrl: imageUrl || null,
  });
  return res.data;
}

export async function renameCategory(categoryId: string, name: string, imageUrl?: string | null) {
  const res = await api.put(`/wholesaler/categories/${categoryId}`, {
    name,
    ...(imageUrl !== undefined ? { imageUrl } : {}),
  });
  return res.data;
}

export async function deleteCategory(categoryId: string) {
  await api.delete(`/wholesaler/categories/${categoryId}`);
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
  imageUrl?: string | null;
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

export async function renameSubcategory(subcategoryId: string, name: string, imageUrl?: string | null) {
  const res = await api.put(`/wholesaler/subcategories/${subcategoryId}`, {
    name,
    ...(imageUrl !== undefined ? { imageUrl } : {}),
  });
  return res.data;
}

export async function deleteSubcategory(subcategoryId: string) {
  await api.delete(`/wholesaler/subcategories/${subcategoryId}`);
}

