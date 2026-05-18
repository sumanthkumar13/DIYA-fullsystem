import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CHART_COLORS } from "@/lib/analyticsChart";
import { formatINR } from "@/lib/money";
import type { MonthlyRetailerBreakdown } from "@/services/analytics";
import { AnalyticsChartStates } from "./AnalyticsChartStates";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Store, X } from "lucide-react";

type Props = {
  year: number;
  month: number;
  monthLabel: string;
  data: MonthlyRetailerBreakdown | undefined;
  isLoading: boolean;
  isError: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onClose: () => void;
  onRetry?: () => void;
};

const chartConfig = {
  amount: { label: "Sales", color: CHART_COLORS.sales },
};

export function MonthRetailerBreakdown({
  year,
  month,
  monthLabel,
  data,
  isLoading,
  isError,
  page,
  onPageChange,
  onClose,
  onRetry,
}: Props) {
  const rows = data?.content ?? [];
  const isEmpty = !isLoading && !isError && rows.length === 0;

  const chartData = rows.map((r) => ({
    name: r.shopName.length > 22 ? `${r.shopName.slice(0, 20)}…` : r.shopName,
    fullName: r.shopName,
    amount: r.amount,
    percentage: r.percentage,
  }));

  const label = monthLabel || `${month}/${year}`;
  const totalPages = Math.max(1, data?.totalPages ?? 1);

  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">Month drilldown</p>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Store className="h-5 w-5 text-orange-600" />
            {label}
          </h3>
          {data && !isLoading ? (
            <p className="text-sm text-gray-600 mt-1">
              Total sales: <span className="font-semibold">{formatINR(data.monthTotal)}</span>
            </p>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4 mr-1" /> Close
        </Button>
      </div>

      <AnalyticsChartStates
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        onRetry={onRetry}
        loadingHeight="h-[220px]"
        emptyTitle="No retailer sales this month"
        emptyDescription="No accepted orders were recorded for retailers in this month."
      >
        <ChartContainer config={chartConfig} className="h-[min(280px,45vh)] w-full aspect-auto">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#374151" }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const pct = (item?.payload as { percentage?: number })?.percentage;
                    return (
                      <span className="font-medium">
                        {formatINR(Number(value))}
                        {pct != null ? ` (${pct.toFixed(1)}%)` : ""}
                      </span>
                    );
                  }}
                  labelFormatter={(_, payload) =>
                    (payload?.[0]?.payload as { fullName?: string })?.fullName ?? ""
                  }
                />
              }
            />
            <Bar
              dataKey="amount"
              fill={CHART_COLORS.neutral}
              radius={[0, 6, 6, 0]}
              barSize={22}
              animationDuration={500}
            />
          </BarChart>
        </ChartContainer>
      </AnalyticsChartStates>

      {!isLoading && !isError && rows.length > 0 ? (
        <ul className="space-y-2 pt-2 border-t border-orange-100">
          {rows.map((r) => (
            <li key={r.retailerId} className="flex justify-between gap-2 text-sm">
              <span className="text-gray-800 font-medium truncate">{r.shopName}</span>
              <span className="text-gray-600 shrink-0">
                {formatINR(r.amount)}{" "}
                <span className="text-gray-400">({r.percentage.toFixed(1)}%)</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {totalPages > 1 && !isLoading && !isError ? (
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
