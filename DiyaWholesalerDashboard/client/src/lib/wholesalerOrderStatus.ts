import type { OrderListItem } from "@/services/order";

/** Map backend order status to short UI label (wholesaler dashboard). */
export function mapBackendOrderStatusToUi(status: string): string {
  const s = (status || "").toUpperCase();
  const statusMap: Record<string, string> = {
    PLACED: "Pending",
    ACCEPTED: "Approved",
    PACKING: "Packed",
    DISPATCHED: "Out for Delivery",
    DELIVERED: "Delivered",
    COMPLETED: "Delivered",
    INVOICED: "Delivered",
    CANCELLED: "Cancelled",
    REJECTED: "Rejected",
  };
  return statusMap[s] || status;
}

/**
 * Pill/badge classes for UI status labels from {@link mapBackendOrderStatusToUi}.
 * Pending = warning, Delivered = success, Rejected/Cancelled = error, etc.
 */
export function wholesalerOrderUiStatusPillClass(uiStatus: string): string {
  switch (uiStatus) {
    case "Pending":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "Approved":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Packed":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "Out for Delivery":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "Delivered":
      return "bg-green-100 text-green-700 border-green-200";
    case "Cancelled":
    case "Rejected":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function parseOrderInstant(dateString: string): Date | null {
  const s = dateString.trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Start of local calendar day (00:00 in the user's timezone). */
function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Whole local calendar days from the order's day to "now"'s day (non-negative).
 * Fixes false "Today" labels when an order was yesterday but less than 24 hours ago by wall clock.
 */
function localCalendarDayDiff(now: Date, then: Date): number {
  return Math.round((startOfLocalDayMs(now) - startOfLocalDayMs(then)) / 86400000);
}

const timeHm12: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

/** Relative-style date for order list cards (Orders page). Uses local timezone and calendar days. */
export function formatOrderListRelativeDate(dateString: string): string {
  if (!dateString) return "";
  const then = parseOrderInstant(dateString);
  if (!then) return dateString;

  const now = new Date();
  const diffMs = now.getTime() - then.getTime();

  if (diffMs < 0) {
    return then.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...timeHm12,
    });
  }

  const dayDiff = localCalendarDayDiff(now, then);
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (dayDiff === 0) {
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return diffMins === 1 ? "1 min ago" : `${diffMins} min ago`;
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }

  if (dayDiff === 1) {
    return `Yesterday, ${then.toLocaleTimeString("en-IN", timeHm12)}`;
  }

  if (dayDiff >= 2 && dayDiff < 7) {
    const weekday = then.toLocaleDateString("en-IN", { weekday: "short" });
    return `${weekday}, ${then.toLocaleTimeString("en-IN", timeHm12)}`;
  }

  const sameYear = then.getFullYear() === now.getFullYear();
  return then.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    ...timeHm12,
  });
}

/** Normalize one row from GET /wholesaler/orders into {@link OrderListItem}. */
export function normalizeWholesalerOrderListItem(order: Record<string, unknown>): OrderListItem {
  const created = (order.createdAt ?? order.date ?? "") as string;
  return {
    id: String(order.id ?? ""),
    orderNumber: String(order.orderNumber ?? ""),
    retailerId: String(order.retailerId ?? ""),
    retailer:
      typeof order.retailer === "string" && order.retailer.trim() ? order.retailer.trim() : "Retailer",
    location: String(order.location ?? ""),
    region: String(order.region ?? ""),
    amount: Number(order.amount ?? 0),
    createdAt: created,
    date: formatOrderListRelativeDate(created),
    status: mapBackendOrderStatusToUi(String(order.status ?? "PLACED")),
    items: Number(order.items ?? 0),
    exposure: String(order.exposure ?? "NORMAL"),
    dueDate: (order.dueDate as string | null | undefined) ?? null,
    unpaidAmount:
      typeof order.unpaidAmount === "number" ? order.unpaidAmount : Number(order.unpaidAmount ?? 0),
  };
}
