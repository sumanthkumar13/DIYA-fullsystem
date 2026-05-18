import { KPI_PERIOD_OPTIONS, type KpiTimePeriod } from "@/lib/kpiPeriod";

export function periodLabel(period: KpiTimePeriod): string {
  return KPI_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "This month";
}
