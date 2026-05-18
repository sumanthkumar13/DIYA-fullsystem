import { MapPin, CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KPI_PERIOD_OPTIONS, type KpiTimePeriod } from "@/lib/kpiPeriod";
import { cn } from "@/lib/utils";

const FILTER_TRIGGER_CLASS =
  "h-9 w-full min-w-[9.5rem] sm:w-[10.75rem] bg-gray-50/80 border-gray-200 text-sm font-medium shrink-0";

type Props = {
  region: string;
  period: KpiTimePeriod;
  regions: string[];
  regionsLoading: boolean;
  onRegionChange: (region: string) => void;
  onPeriodChange: (period: KpiTimePeriod) => void;
  /** Hide period dropdown (e.g. month drilldown tied to chart selection). */
  showPeriod?: boolean;
  /** Hide region dropdown (e.g. region breakdown card). */
  showRegion?: boolean;
  className?: string;
};

export function AnalyticsCardFilters({
  region,
  period,
  regions,
  regionsLoading,
  onRegionChange,
  onPeriodChange,
  showPeriod = true,
  showRegion = true,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-row flex-wrap items-center gap-2 justify-end w-full",
        className,
      )}
    >
      {showRegion ? (
        <Select value={region} onValueChange={onRegionChange} disabled={regionsLoading}>
          <SelectTrigger className={FILTER_TRIGGER_CLASS} aria-label="Region filter">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mr-1.5" aria-hidden />
            <SelectValue placeholder={regionsLoading ? "Loading…" : "All regions"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {showPeriod ? (
        <Select value={period} onValueChange={(v) => onPeriodChange(v as KpiTimePeriod)}>
          <SelectTrigger className={FILTER_TRIGGER_CLASS} aria-label="Date filter">
            <CalendarRange className="h-3.5 w-3.5 text-gray-500 shrink-0 mr-1.5" aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KPI_PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
