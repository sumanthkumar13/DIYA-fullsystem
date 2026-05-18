import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CHART_COLORS, formatINRCompact, growthPercent } from "@/lib/analyticsChart";
import { formatINR } from "@/lib/money";
import type { SalesTrend, SalesTrendGranularity, SalesTrendPoint } from "@/services/analytics";
import { AnalyticsChartStates } from "./AnalyticsChartStates";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  data: SalesTrend | undefined;
  granularity: SalesTrendGranularity;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  selectedMonthKey: string | null;
  onSelectMonth?: (point: SalesTrendPoint) => void;
};

const chartConfig = {
  revenue: { label: "Sales", color: CHART_COLORS.sales },
};

export function SalesTrendChart({
  data,
  granularity,
  isLoading,
  isError,
  onRetry,
  selectedMonthKey,
  onSelectMonth,
}: Props) {
  const points = data?.points ?? [];
  const isEmpty = !isLoading && !isError && points.every((p) => (p.revenue ?? 0) === 0);

  const growth = useMemo(
    () => growthPercent(data?.totalRevenue ?? 0, data?.comparisonRevenue ?? 0),
    [data?.totalRevenue, data?.comparisonRevenue],
  );

  const lineColor =
    growth == null || growth === 0
      ? CHART_COLORS.sales
      : growth > 0
        ? CHART_COLORS.salesUp
        : CHART_COLORS.salesDown;

  const chartData = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        revenue: Number(p.revenue ?? 0),
        shortLabel: p.label.length > 12 ? p.label.replace(/\s+\d{4}$/, "") : p.label,
      })),
    [points],
  );

  const useBars = granularity === "MONTHLY";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <GrowthBadge growth={growth} />
        {!isLoading && !isError && data ? (
          <p className="text-sm text-gray-600">
            Total in view: <span className="font-semibold text-gray-900">{formatINR(data.totalRevenue)}</span>
          </p>
        ) : null}
        {granularity === "MONTHLY" && !isEmpty ? (
          <p className="text-xs text-gray-500 w-full sm:w-auto">Tap a month bar to see retailer split</p>
        ) : null}
      </div>

      <AnalyticsChartStates
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        onRetry={onRetry}
        emptyTitle="No sales in this period"
        emptyDescription="Accepted orders will show up here as your business grows."
      >
        <ChartContainer config={chartConfig} className="h-[min(320px,50vh)] w-full aspect-auto">
          {useBars ? (
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="shortLabel"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={formatINRCompact}
                width={52}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatINR(Number(value))}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                  />
                }
              />
              <Bar
                dataKey="revenue"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
                animationDuration={600}
                cursor="pointer"
                onClick={(state) => {
                  const row = state?.payload as SalesTrendPoint | undefined;
                  if (row && onSelectMonth) onSelectMonth(row);
                }}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={entry.key === selectedMonthKey ? CHART_COLORS.neutral : lineColor}
                    fillOpacity={selectedMonthKey && entry.key !== selectedMonthKey ? 0.45 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="shortLabel"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={formatINRCompact}
                width={52}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatINR(Number(value))}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={lineColor}
                strokeWidth={2.5}
                fill="url(#salesFill)"
                dot={{ r: 3, fill: lineColor }}
                activeDot={{ r: 5 }}
                animationDuration={700}
              />
            </AreaChart>
          )}
        </ChartContainer>
      </AnalyticsChartStates>
    </div>
  );
}

function GrowthBadge({ growth }: { growth: number | null }) {
  if (growth == null) return null;
  const up = growth > 0;
  const down = growth < 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        up && "bg-green-50 text-green-700",
        down && "bg-red-50 text-red-700",
        !up && !down && "bg-blue-50 text-blue-700",
      )}
    >
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : down ? <TrendingDown className="h-3.5 w-3.5" /> : null}
      {up ? "+" : ""}
      {growth.toFixed(1)}% vs previous period
    </span>
  );
}
