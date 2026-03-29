import { AlertCircle, CalendarDays, Package, ReceiptIndianRupee, Truck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  useAnalyticsMonthlySales,
  useAnalyticsOrderStatus,
  useAnalyticsPendingPayments,
  useAnalyticsSlowProducts,
  useAnalyticsSummary,
  useAnalyticsTopProducts,
  useAnalyticsTopRetailers,
} from "@/hooks/useAnalytics";

function formatINR(value: unknown, digits = 0) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: digits,
  }).format(n);
}

function formatMonthLabel(year: number, month: number) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Analytics() {
  const summaryQ = useAnalyticsSummary();
  const topProductsQ = useAnalyticsTopProducts(10);
  const slowProductsQ = useAnalyticsSlowProducts(30, 10);
  const topRetailersQ = useAnalyticsTopRetailers(10);
  const pendingPaymentsQ = useAnalyticsPendingPayments(10);
  const monthlySalesQ = useAnalyticsMonthlySales();
  const orderStatusQ = useAnalyticsOrderStatus();

  const anyError =
    summaryQ.error ||
    topProductsQ.error ||
    slowProductsQ.error ||
    topRetailersQ.error ||
    pendingPaymentsQ.error ||
    monthlySalesQ.error ||
    orderStatusQ.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">Sales, retailers, dues, and inventory at a glance.</p>
        </div>
      </div>

      {anyError ? (
        <div className="text-sm text-red-600">Some analytics data failed to load. You can still view what is available.</div>
      ) : null}

      {/* Section 1 — Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-500">Today Sales</p>
            {summaryQ.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-gray-900 font-display">
                {formatINR(summaryQ.data?.todaySales)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-500">Month Sales</p>
            {summaryQ.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-gray-900 font-display">
                {formatINR(summaryQ.data?.monthSales)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-500">Outstanding Payments</p>
            {summaryQ.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-red-700 font-display">
                {formatINR(summaryQ.data?.outstandingPayments)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-500">Orders This Month</p>
            {summaryQ.isLoading ? (
              <Skeleton className="mt-2 h-8 w-24" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-gray-900 font-display">
                {(summaryQ.data?.ordersThisMonth ?? 0).toLocaleString("en-IN")} Orders
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-500">Average Order Value</p>
            {summaryQ.isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-gray-900 font-display">
                {formatINR(summaryQ.data?.averageOrderValue)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 2 — Sales Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ReceiptIndianRupee className="h-4 w-4 text-primary" />
              Top Selling Products (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topProductsQ.isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (topProductsQ.data?.length ?? 0) === 0 ? (
              <Empty className="m-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Package />
                  </EmptyMedia>
                  <EmptyTitle>No product sales yet</EmptyTitle>
                  <EmptyDescription>Once orders start coming in, your top products will appear here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProductsQ.data!.map((row) => (
                    <TableRow key={row.productId}>
                      <TableCell className="font-medium">{row.productName}</TableCell>
                      <TableCell className="text-right">{(row.totalQuantitySold ?? 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right">{formatINR(row.totalRevenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Slow Moving Products (30+ days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {slowProductsQ.isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (slowProductsQ.data?.length ?? 0) === 0 ? (
              <Empty className="m-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Package />
                  </EmptyMedia>
                  <EmptyTitle>No slow products</EmptyTitle>
                  <EmptyDescription>Looks good—your products are moving in the last 30 days.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Last Sold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowProductsQ.data!.map((row) => (
                    <TableRow key={row.productId}>
                      <TableCell className="font-medium">{row.productName}</TableCell>
                      <TableCell className="text-right">{(row.currentStock ?? 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right">{formatDateTime(row.lastSoldAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 3 — Retailer Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Top Retailers (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topRetailersQ.isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (topRetailersQ.data?.length ?? 0) === 0 ? (
              <Empty className="m-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>No retailer sales yet</EmptyTitle>
                  <EmptyDescription>Your best customers will show up once orders are placed.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Retailer</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topRetailersQ.data!.map((row) => (
                    <TableRow key={row.retailerId}>
                      <TableCell className="font-medium">{row.retailerName}</TableCell>
                      <TableCell className="text-right">{(row.totalOrders ?? 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right">{formatINR(row.totalRevenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ReceiptIndianRupee className="h-4 w-4 text-red-700" />
              Retailers With Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pendingPaymentsQ.isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (pendingPaymentsQ.data?.length ?? 0) === 0 ? (
              <Empty className="m-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ReceiptIndianRupee />
                  </EmptyMedia>
                  <EmptyTitle>No pending payments</EmptyTitle>
                  <EmptyDescription>Great—no retailers currently owe you money.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Retailer</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Last Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPaymentsQ.data!.map((row) => (
                    <TableRow key={row.retailerId}>
                      <TableCell className="font-medium">{row.retailerName}</TableCell>
                      <TableCell className="text-right font-semibold text-red-700">
                        {formatINR(row.outstandingAmount)}
                      </TableCell>
                      <TableCell className="text-right">{formatDateTime(row.lastPaymentAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 4 — Business Trends */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Monthly Sales (Last 12 months)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {monthlySalesQ.isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (monthlySalesQ.data?.length ?? 0) === 0 ? (
            <Empty className="m-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDays />
                </EmptyMedia>
                <EmptyTitle>No monthly sales data</EmptyTitle>
                <EmptyDescription>Once you have orders, this table will populate month-by-month.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlySalesQ.data!.map((row) => (
                  <TableRow key={`${row.year}-${row.month}`}>
                    <TableCell className="font-medium">{formatMonthLabel(row.year, row.month)}</TableCell>
                    <TableCell className="text-right">{formatINR(row.totalRevenue)}</TableCell>
                    <TableCell className="text-right">{(row.totalOrders ?? 0).toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section 5 — Order Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Pending Orders</p>
              <div className="h-9 w-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Package className="h-4 w-4" />
              </div>
            </div>
            {orderStatusQ.isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-gray-900 font-display">
                {(orderStatusQ.data?.pendingOrders ?? 0).toLocaleString("en-IN")}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Dispatched Orders</p>
              <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            {orderStatusQ.isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-gray-900 font-display">
                {(orderStatusQ.data?.dispatchedOrders ?? 0).toLocaleString("en-IN")}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Delivered Orders</p>
              <div className="h-9 w-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            {orderStatusQ.isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <div className="mt-2 text-2xl font-bold text-gray-900 font-display">
                {(orderStatusQ.data?.deliveredOrders ?? 0).toLocaleString("en-IN")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
