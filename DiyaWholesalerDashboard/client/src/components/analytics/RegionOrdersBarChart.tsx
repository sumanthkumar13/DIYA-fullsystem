import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CHART_COLORS } from "@/lib/analyticsChart";
import type { OrdersByRegion } from "@/services/analytics";
import { AnalyticsChartStates } from "./AnalyticsChartStates";

const BAR_SLOT_PX = 52;
const MIN_BAR_SIZE = 28;
const MAX_BAR_SIZE = 44;

type Props = {
  data: OrdersByRegion | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
};

const chartConfig = {
  orderCount: { label: "Orders", color: CHART_COLORS.sales },
};

function truncateLabel(name: string, max = 14) {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

export function RegionOrdersBarChart({ data, isLoading, isError, onRetry }: Props) {
  const regions = data?.regions ?? [];
  const totalOrders = data?.totalOrders ?? 0;
  const isEmpty = !isLoading && !isError && totalOrders === 0;

  const chartData = useMemo(
    () =>
      regions.map((r) => ({
        region: r.region,
        shortRegion: truncateLabel(r.region),
        orderCount: r.orderCount,
      })),
    [regions],
  );

  const scrollMinWidth = Math.max(regions.length * BAR_SLOT_PX, 320);
  const barSize = Math.min(MAX_BAR_SIZE, Math.max(MIN_BAR_SIZE, BAR_SLOT_PX - 12));

  return (
    <div className="space-y-3">
      {!isLoading && !isError && data ? (
        <p className="text-base sm:text-lg text-gray-800">
          Total orders:{" "}
          <span className="font-bold text-gray-900 tabular-nums">
            {totalOrders.toLocaleString("en-IN")}
          </span>
        </p>
      ) : null}

      <AnalyticsChartStates
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        onRetry={onRetry}
        loadingHeight="h-[280px]"
        emptyTitle="No orders in this period"
        emptyDescription="Orders placed in this period will appear here grouped by retailer region."
      >
        <div
          className="overflow-x-auto overflow-y-hidden scroll-smooth pb-1 -mx-1 px-1"
          role="region"
          aria-label="Region-wise order chart"
        >
          <ChartContainer
            config={chartConfig}
            className="h-[min(320px,45vh)] aspect-auto"
            style={{ minWidth: scrollMinWidth, width: "100%" }}
          >
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 12, left: 4, bottom: 72 }}
              barCategoryGap="18%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="shortRegion"
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-40}
                textAnchor="end"
                height={72}
                tick={{ fontSize: 13, fill: "#374151", fontWeight: 500 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={40}
                tick={{ fontSize: 13, fill: "#4b5563" }}
                label={{
                  value: "Orders",
                  angle: -90,
                  position: "insideLeft",
                  offset: 8,
                  style: { fontSize: 12, fill: "#6b7280", fontWeight: 500 },
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [
                      `${Number(value).toLocaleString("en-IN")} orders`,
                      "Count",
                    ]}
                    labelFormatter={(_, payload) =>
                      (payload?.[0]?.payload as { region?: string })?.region ?? ""
                    }
                  />
                }
              />
              <Bar
                dataKey="orderCount"
                fill={CHART_COLORS.sales}
                radius={[8, 8, 0, 0]}
                barSize={barSize}
                animationDuration={550}
                animationEasing="ease-out"
              />
            </BarChart>
          </ChartContainer>
        </div>
      </AnalyticsChartStates>
    </div>
  );
}
