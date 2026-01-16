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
