import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchRetailerStatement } from "@/services/khatabook";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/money";

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatAmount(n: number) {
  return formatINR(n);
}

export default function RetailerStatementPage() {
  const [match, params] = useRoute("/khatabook/:retailerId");
  const retailerId = params?.retailerId ?? "";

  const { data: statement, isLoading, error } = useQuery({
    queryKey: ["retailer-statement", retailerId],
    queryFn: () => fetchRetailerStatement(retailerId),
    enabled: !!retailerId,
  });

  if (!retailerId) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500">Invalid retailer.</p>
        <Link href="/khatabook">
          <span className="text-primary hover:underline">Back to Khatabook</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/khatabook" className="hover:text-primary flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Khatabook
        </Link>
        {statement?.retailerName && (
          <>
            <span>/</span>
            <span className="text-gray-900 font-medium">{statement.retailerName}</span>
          </>
        )}
      </div>

      {isLoading && (
        <>
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
          <p className="text-sm text-gray-500">Loading statement...</p>
        </>
      )}

      {error && (
        <Card className="border-gray-200 shadow-sm bg-white">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Could not load statement. The retailer may not be connected.</p>
            <Link href="/khatabook">
              <span className="text-primary hover:underline text-sm mt-2 inline-block">Back to Khatabook</span>
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && statement && (
        <>
          {/* Summary card */}
          <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <h1 className="text-2xl font-display font-bold text-gray-900 mb-4">
                {statement.retailerName || "Retailer"}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Current Outstanding
                  </p>
                  <p className="text-2xl font-display font-bold text-gray-900">
                    {formatAmount(Number(statement.totalOutstanding ?? 0))}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Amount you will receive</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Overdue
                  </p>
                  {Number(statement.overdueDays ?? 0) === 0 ? (
                    <p className="text-lg font-semibold text-green-600">On Time</p>
                  ) : (
                    <p className="text-lg font-semibold text-red-600">
                      {statement.overdueDays} days overdue
                    </p>
                  )}
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Total Transactions
                  </p>
                  <p className="text-2xl font-display font-bold text-gray-900">
                    {statement.ledger?.length ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ledger list */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Transaction history</h2>
            <p className="text-sm text-gray-500 mb-4">
              Oldest first, like a khata notebook. Running balance shows amount you will receive after each entry.
            </p>

            {!statement.ledger?.length ? (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900">No transactions yet</h3>
                  <p className="text-gray-500 text-sm mt-1">No transactions yet with this retailer.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {statement.ledger.map((line: any, index: number) => {
                  const t = (line.type || "").toUpperCase();
                  const isInfo =
                    line.informational === true || t === "ORDER_PAYMENT_INFO";
                  const isDebit = t === "DEBIT";
                  const label = isInfo
                    ? "Payment at order (informational)"
                    : isDebit
                      ? "Credit on account"
                      : "Payment received";
                  const amountNum = Number(line.amount ?? 0);
                  const balanceNum = Number(line.runningBalance ?? 0);
                  return (
                    <Card
                      key={index}
                      className={cn(
                        "bg-white border-gray-200 shadow-sm hover:shadow-md transition-all",
                        isInfo && "border-sky-100 bg-sky-50/40",
                      )}
                    >
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-500">{label}</p>
                            {isInfo && (
                              <Badge variant="secondary" className="text-[10px] font-semibold bg-sky-100 text-sky-800 border-0">
                                Does not change balance
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 mt-0.5">
                            {line.description ||
                              (isDebit
                                ? "Credit on account"
                                : isInfo
                                  ? "Cash paid when order was accepted"
                                  : "Payment received")}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(line.date)}
                          </p>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <p
                            className={cn(
                              "text-lg font-bold",
                              isInfo && "text-sky-800",
                              !isInfo && isDebit && "text-red-600",
                              !isInfo && !isDebit && "text-green-600",
                            )}
                          >
                            {isInfo ? (
                              <span>{formatAmount(amountNum)}</span>
                            ) : (
                              <>
                                {isDebit ? "+" : "−"} {formatAmount(amountNum)}
                              </>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {isInfo
                              ? `Outstanding unchanged: ${formatAmount(balanceNum)}`
                              : `Balance after this: ${formatAmount(balanceNum)}`}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
