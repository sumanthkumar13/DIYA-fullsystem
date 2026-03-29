/** Canonical regions — must match backend {@code RegionCatalog.CANONICAL_REGIONS}. */
export const WHOLESALER_REGIONS = [
  "Banjara Hills",
  "Jubilee Hills",
  "Madhapur",
  "Kukatpally",
  "Old City",
  "Gachibowli",
] as const;

export type WholesalerRegion = (typeof WHOLESALER_REGIONS)[number];
