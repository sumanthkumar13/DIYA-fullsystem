import api from "@/lib/axios";

/**
 * Fetch paginated products for logged-in wholesaler
 * Backend: GET /api/wholesaler/products
 */
export async function fetchProducts(
  page: number = 0,
  size: number = 20,
  search?: string,
  categoryId?: string,
  subcategoryId?: string
) {
  const params: any = { page, size };

  if (search && search.trim().length > 0) {
    params.search = search.trim();
  }

  if (categoryId) {
    params.categoryId = categoryId;
  }

  if (subcategoryId) {
    params.subcategoryId = subcategoryId;
  }

  const res = await api.get("/wholesaler/products", { params });
  return res.data;
}

/**
 * Create new product
 * Backend: POST /api/wholesaler/products
 */
export async function createProduct(payload: any) {
  const res = await api.post("/wholesaler/products", payload);
  return res.data;
}

/**
 * Toggle ACTIVE status
 * Backend: PUT /api/wholesaler/products/{id}
 */
export async function toggleProductActive(productId: string, active: boolean) {
  const res = await api.put(`/wholesaler/products/${productId}`, { active });
  return res.data;
}

/**
 * Toggle VISIBILITY to retailers
 * Backend: PUT /api/wholesaler/products/{id}
 */
export async function toggleProductVisibility(
  productId: string,
  visibleToRetailer: boolean
) {
  const res = await api.put(`/wholesaler/products/${productId}`, {
    visibleToRetailer,
  });
  return res.data;
}

export async function fetchProduct(productId: string) {
  const res = await api.get(`/wholesaler/products/${productId}`);
  return res.data;
}

export async function updateProduct(productId: string, payload: Record<string, unknown>) {
  const res = await api.put(`/wholesaler/products/${productId}`, payload);
  return res.data;
}

export async function deleteProduct(productId: string) {
  await api.delete(`/wholesaler/products/${productId}`);
}

export type RetailerVisibilityRow = {
  retailerId: string;
  name: string;
  visible: boolean;
};

export async function fetchProductRetailerVisibility(
  productId: string
): Promise<RetailerVisibilityRow[]> {
  const res = await api.get(`/wholesaler/products/${productId}/retailer-visibility`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function saveProductRetailerVisibility(
  productId: string,
  hiddenRetailerIds: string[]
) {
  await api.put(`/wholesaler/products/${productId}/retailer-visibility`, {
    hiddenRetailerIds,
  });
}

export async function patchProductQuick(
  productId: string,
  patch: { mrp?: number; stock?: number; categoryId?: string; subcategoryId?: string | null }
) {
  const res = await api.put(`/wholesaler/products/${productId}`, patch);
  return res.data;
}
