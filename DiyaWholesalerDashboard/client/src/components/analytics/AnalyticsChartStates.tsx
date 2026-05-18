import type { ReactNode } from "react";
import { AlertCircle, BarChart3, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

type Props = {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry?: () => void;
  loadingHeight?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
};

export function AnalyticsChartStates({
  isLoading,
  isError,
  isEmpty,
  onRetry,
  loadingHeight = "h-[280px]",
  emptyTitle = "No data yet",
  emptyDescription = "Data will appear once you have sales in this period.",
  children,
}: Props) {
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${loadingHeight}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
        <p className="text-sm text-gray-500">Loading chart…</p>
        <Skeleton className="h-2 w-3/4 max-w-xs" />
        <Skeleton className="h-2 w-1/2 max-w-[10rem]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 text-center px-4 ${loadingHeight}`}>
        <AlertCircle className="h-9 w-9 text-red-500" />
        <p className="text-sm font-medium text-gray-800">Could not load this chart</p>
        <p className="text-xs text-gray-500">Check your connection and try again.</p>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <Empty className={`border-0 py-8 ${loadingHeight}`}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BarChart3 />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent />
      </Empty>
    );
  }

  return <>{children}</>;
}
