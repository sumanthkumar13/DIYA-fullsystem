import { useQuery } from "@tanstack/react-query";
import { fetchRetailers } from "@/services/retailer";

function uniqNonEmptyStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/**
 * Regions derived from retailer signup region field.
 * Source: GET /api/wholesaler/retailers (approved connections)
 *
 * Cached to avoid redundant calls; returns a stable array of unique region names.
 */
export function useRetailerRegions() {
  return useQuery({
    queryKey: ["retailer-regions"],
    queryFn: fetchRetailers,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    select: (retailers: any[]) =>
      uniqNonEmptyStrings((Array.isArray(retailers) ? retailers : []).map((r) => r?.region)),
  });
}

