/** Compact INR for chart axes (₹12.5K style). */
export function formatINRCompact(value: number): string {
  if (!Number.isFinite(value)) return "₹0";
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(1)}Cr`;
  if (abs >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${Math.round(value)}`;
}

export function growthPercent(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export const CHART_COLORS = {
  sales: "hsl(221, 83%, 53%)",
  salesUp: "hsl(142, 71%, 45%)",
  salesDown: "hsl(0, 72%, 51%)",
  neutral: "hsl(25, 95%, 53%)",
  grid: "hsl(220, 13%, 91%)",
} as const;
