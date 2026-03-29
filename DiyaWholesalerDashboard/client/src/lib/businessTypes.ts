/** Must match backend {@code BusinessTypeCatalog.CANONICAL_TYPES}. */
export const WHOLESALER_BUSINESS_TYPES = [
  "Kirana Store",
  "Supermarket",
  "Medical Shop",
  "Electronics",
  "Clothing / Garments",
  "Hardware",
  "Restaurant / Hotel",
  "General Store",
  "Others",
] as const;

export type WholesalerBusinessType = (typeof WHOLESALER_BUSINESS_TYPES)[number];
