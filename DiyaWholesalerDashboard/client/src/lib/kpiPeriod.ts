export type KpiTimePeriod = "TODAY" | "YESTERDAY" | "THIS_WEEK" | "THIS_MONTH";

export const KPI_PERIOD_OPTIONS: { value: KpiTimePeriod; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "THIS_MONTH", label: "This month" },
];

export function parseKpiPeriod(raw: string | null | undefined): KpiTimePeriod {
  const u = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (u === "YESTERDAY" || u === "THIS_WEEK" || u === "THIS_MONTH") return u as KpiTimePeriod;
  return "TODAY";
}

/** Parsed from `location.search` (wouter `useSearch()`), kept in sync with `buildSalesHref`. */
export type SalesUrlState = {
  region: string;
  period: KpiTimePeriod;
  /** 0-based page index, matches backend `page` query param. */
  page: number;
};

export function parseSalesUrlSearch(search: string): SalesUrlState {
  const raw = search && search[0] === "?" ? search.slice(1) : search;
  const q = new URLSearchParams(raw);
  const regionRaw = q.get("region");
  const region = regionRaw != null && regionRaw.trim() !== "" ? regionRaw.trim() : "all";
  const period = parseKpiPeriod(q.get("period"));
  const pageRaw = q.get("page");
  let page = 0;
  if (pageRaw != null) {
    const n = parseInt(pageRaw, 10);
    if (Number.isFinite(n) && n >= 0) page = Math.floor(n);
  }
  return { region, period, page };
}

/**
 * Path + query for Sales details.
 * Omits `period` when TODAY and `page` when 0 for cleaner URLs.
 */
export function buildSalesHref(region: string, period: KpiTimePeriod, page: number = 0): string {
  const q = new URLSearchParams();
  if (region && region !== "all") q.set("region", region);
  if (period && period !== "TODAY") q.set("period", period);
  if (page > 0) q.set("page", String(page));
  const s = q.toString();
  return s ? `/sales?${s}` : "/sales";
}
