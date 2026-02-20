import api from "@/lib/axios";

export type HsnSuggestResponse = {
  hsnCode: string | null;
  gstRate: number | null;
  description: string | null;
  confidence: string;
  matchedKeyword: string | null;
};

/**
 * GET /api/hsn/suggest?name={productName}
 * Optional signal to cancel previous request.
 */
export async function suggestHsn(
  productName: string,
  signal?: AbortSignal
): Promise<HsnSuggestResponse> {
  const res = await api.get<HsnSuggestResponse>("/hsn/suggest", {
    params: { name: productName },
    signal,
  });
  return res.data;
}
