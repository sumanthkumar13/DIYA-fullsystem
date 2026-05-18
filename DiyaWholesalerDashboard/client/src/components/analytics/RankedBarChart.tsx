import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { CHART_COLORS } from "@/lib/analyticsChart";
import { formatINR } from "@/lib/money";
import { AnalyticsChartStates } from "./AnalyticsChartStates";

export type RankedRow = {
  id: string;
  label: string;
  value: number;
  sublabel?: string;
  /** Extra lines shown in the chart tooltip (e.g. orders, due, avg). */
  detailLines?: string[];
};

type Props = {
  rows: RankedRow[];
  valueLabel?: string;
  barColor?: string;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
};

const chartConfig = {
  value: { label: "Amount", color: CHART_COLORS.sales },
};

export function RankedBarChart({
  rows,
  valueLabel = "Amount",
  barColor = CHART_COLORS.sales,
  isLoading,
  isError,
  onRetry,
  emptyTitle = "No data yet",
  emptyDescription = "Information will appear when available.",
}: Props) {
  const isEmpty = !isLoading && !isError && rows.length === 0;
  const chartData = rows.map((r) => ({
    id: r.id,
    name: r.label.length > 24 ? `${r.label.slice(0, 22)}…` : r.label,
    fullName: r.label,
    value: r.value,
    sublabel: r.sublabel,
    detailLines: r.detailLines,
  }));

  return (
    <AnalyticsChartStates
      isLoading={isLoading}
      isError={isError}
      isEmpty={isEmpty}
      onRetry={onRetry}
      loadingHeight="h-[200px]"
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    >
      <ChartContainer
        config={{ ...chartConfig, value: { label: valueLabel, color: barColor } }}
        className="h-[min(240px,40vh)] w-full aspect-auto"
      >
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#374151" }}
          />
          <ChartTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as {
                fullName?: string;
                value?: number;
                detailLines?: string[];
              };
              return (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-semibold text-gray-900 mb-1">{row.fullName}</p>
                  <p className="text-gray-700">
                    {valueLabel}:{" "}
                    <span className="font-medium tabular-nums">{formatINR(Number(row.value ?? 0))}</span>
                  </p>
                  {(row.detailLines ?? []).map((line) => (
                    <p key={line} className="text-gray-600 mt-0.5">
                      {line}
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Bar dataKey="value" fill={barColor} radius={[0, 6, 6, 0]} barSize={20} animationDuration={500} />
        </BarChart>
      </ChartContainer>
    </AnalyticsChartStates>
  );
}
