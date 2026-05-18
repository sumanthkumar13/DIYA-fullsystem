import { useMemo, useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  RefreshCcw,
  MapPin,
  Phone,
  Search,
} from "lucide-react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ConnectionStatus = "PENDING" | "APPROVED" | "REJECTED" | "BLOCKED";

type ConnectionRow = {
  id: string;
  status: ConnectionStatus;
  requestedAt?: string;

  retailerId?: string;
  /** Shop / business name (from retailer profile). */
  retailerBusinessName?: string;
  /** Proprietor or contact name (linked user or contact name). */
  retailerProprietorName?: string;
  retailerCity?: string;
  retailerRegion?: string;
  retailerState?: string;
  retailerPhone?: string;
};

function retailerLocationLine(r: ConnectionRow): string | null {
  const parts = [r.retailerCity, r.retailerRegion, r.retailerState]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Case-insensitive match across proprietor name, shop name, city, region, state, phone (incl. digit-only phone match). */
function connectionMatchesSearch(r: ConnectionRow, rawQuery: string): boolean {
  const q = normalizeQuery(rawQuery);
  if (!q) return true;

  const haystackParts = [
    r.retailerProprietorName,
    r.retailerBusinessName,
    r.retailerCity,
    r.retailerRegion,
    r.retailerState,
    r.retailerPhone,
  ]
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.toLowerCase());

  if (haystackParts.some((p) => p.includes(q))) return true;

  const qDigits = digitsOnly(rawQuery);
  if (qDigits.length >= 3 && r.retailerPhone) {
    const phoneDigits = digitsOnly(r.retailerPhone);
    if (phoneDigits.includes(qDigits)) return true;
  }
  return false;
}

function tabForConnection(c: ConnectionRow): "pending" | "approved" | "rejected" {
  if (c.status === "PENDING") return "pending";
  if (c.status === "APPROVED" || c.status === "BLOCKED") return "approved";
  return "rejected";
}

function statusBadge(status: ConnectionStatus) {
  switch (status) {
    case "PENDING":
      return (
        <Badge
          variant="outline"
          className="bg-yellow-50 text-yellow-800 border-yellow-200 shrink-0"
        >
          Pending
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-800 border-green-200 shrink-0"
        >
          Accepted
        </Badge>
      );
    case "BLOCKED":
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-800 border-amber-200 shrink-0"
        >
          Blocked
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 shrink-0"
        >
          Rejected
        </Badge>
      );
  }
}

function formatLastUpdatedFromMs(ts: number | undefined): string | null {
  if (!ts) return null;
  const time = new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `Last updated: ${time}`;
}

export default function ConnectionRequestsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const {
    data: connections = [],
    isLoading: loading,
    isFetching,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["wholesaler-connections"],
    queryFn: async () => {
      const res = await api.get("/wholesaler/connections");
      const raw = res.data as ConnectionRow[];
      if (!Array.isArray(raw)) return [];
      return raw.map((row) => ({
        ...row,
        status: String(row.status ?? "PENDING").toUpperCase() as ConnectionStatus,
      }));
    },
  });

  const refreshLoading = loading || isRefreshing || isFetching;

  const errMessage =
    isError && error
      ? (error as any)?.response?.data?.message ??
        (error instanceof Error ? error.message : "Failed to load connections")
      : null;

  async function handleRefresh() {
    try {
      setIsRefreshing(true);
      await queryClient.invalidateQueries({ queryKey: ["wholesaler-connections"] });
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    return connections.filter((r) => connectionMatchesSearch(r, searchQuery));
  }, [connections, searchQuery]);

  const isSearchActive = searchQuery.trim().length > 0;
  const showNoResults = !loading && isSearchActive && filtered.length === 0;

  const pending = useMemo(
    () => filtered.filter((c) => c.status === "PENDING"),
    [filtered]
  );
  const approved = useMemo(
    () => filtered.filter((c) => c.status === "APPROVED" || c.status === "BLOCKED"),
    [filtered]
  );
  const rejected = useMemo(
    () => filtered.filter((c) => c.status === "REJECTED"),
    [filtered]
  );

  // While searching, if the current tab has no rows but another tab does, jump to the first tab with matches.
  useEffect(() => {
    if (!isSearchActive) return;
    const cur =
      activeTab === "pending"
        ? pending.length
        : activeTab === "approved"
          ? approved.length
          : rejected.length;
    if (cur > 0) return;
    if (pending.length > 0) setActiveTab("pending");
    else if (approved.length > 0) setActiveTab("approved");
    else if (rejected.length > 0) setActiveTab("rejected");
  }, [isSearchActive, activeTab, pending.length, approved.length, rejected.length]);

  function goToConnectionRow(c: ConnectionRow) {
    const tab = tabForConnection(c);
    setActiveTab(tab);
    requestAnimationFrame(() => {
      document.getElementById(`connection-card-${c.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }

  async function updateStatus(id: string, status: "APPROVED" | "REJECTED") {
    try {
      setUpdatingId(id);
      await api.put(`/wholesaler/connections/${id}`, { status });
      await queryClient.invalidateQueries({ queryKey: ["wholesaler-connections"] });
    } catch (e: any) {
      alert(
        e?.response?.data?.message ?? e?.message ?? "Failed to update request"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function tabEmptyText(tab: typeof activeTab) {
    switch (tab) {
      case "pending":
        return isSearchActive
          ? "No pending requests match your search"
          : "No pending requests";
      case "approved":
        return isSearchActive
          ? "No accepted retailers match your search"
          : "No approved retailers yet";
      case "rejected":
        return isSearchActive
          ? "No rejected retailers match your search"
          : "No rejected retailers";
    }
  }

  function profileHrefFor(r: ConnectionRow): string | null {
    if (!r.retailerId) return null;
    if (r.status !== "APPROVED" && r.status !== "BLOCKED") return null;
    return `/retailers/${r.retailerId}`;
  }

  function RetailerCardRow({
    r,
    tab,
  }: {
    r: ConnectionRow;
    tab: typeof activeTab;
  }) {
    const shop = (r.retailerBusinessName ?? "").trim();
    const proprietor = (r.retailerProprietorName ?? "").trim();
    const title = shop || proprietor || "Retailer";
    const secondary =
      shop && proprietor && shop.toLowerCase() !== proprietor.toLowerCase()
        ? proprietor
        : null;
    const location = retailerLocationLine(r);
    const phone = (r.retailerPhone ?? "").trim();
    const href = profileHrefFor(r);

    const card = (
      <Card
        id={`connection-card-${r.id}`}
        className={cn(
          "border-gray-200 bg-white transition-all duration-200 hover:shadow-md hover:border-primary/30",
          "cursor-pointer"
        )}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-start gap-2">
                <h3 className="font-semibold text-gray-900 text-base sm:text-lg leading-snug truncate">
                  {title}
                </h3>
              </div>
              {secondary && (
                <p className="text-sm text-gray-600 mt-0.5 truncate">{secondary}</p>
              )}
              <div className="mt-1 flex flex-col gap-1 text-sm text-gray-500">
                {location && (
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>{phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0">{statusBadge(r.status)}</div>
          </div>

          {(tab === "pending" || tab === "rejected") && (
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              {tab === "pending" ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 text-red-600 border-red-200 hover:bg-red-50"
                    disabled={updatingId === r.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateStatus(r.id, "REJECTED");
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                    disabled={updatingId === r.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateStatus(r.id, "APPROVED");
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="h-9 gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                  disabled={updatingId === r.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateStatus(r.id, "APPROVED");
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Re-Approve
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );

    if (href && tab === "approved") {
      return (
        <Link
          key={r.id}
          href={href}
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {card}
        </Link>
      );
    }

    return <div key={r.id}>{card}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Retailer Connections
          </h1>
          <p className="text-sm text-gray-500">
            Manage retailers: approve, reject and track your approved customers.
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshLoading}>
            <RefreshCcw
              className={cn("h-4 w-4 mr-2", refreshLoading ? "animate-spin" : "")}
            />
            {refreshLoading ? "Refreshing..." : "Refresh"}
          </Button>
          {formatLastUpdatedFromMs(dataUpdatedAt) ? (
            <div className="text-xs text-gray-500">{formatLastUpdatedFromMs(dataUpdatedAt)}</div>
          ) : null}
        </div>
      </div>

      {/* Error */}
      {errMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errMessage}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            ref={searchInputRef}
            placeholder="Search proprietor name, shop name, city, phone..."
            className="bg-gray-50 border-gray-200 w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search connections"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <Badge className="bg-gray-50 text-gray-700 border-gray-200" variant="outline">
            {isSearchActive ? `Matches: ${filtered.length}` : `Total: ${connections.length}`}
          </Badge>
          <Badge className="bg-yellow-50 text-yellow-800 border-yellow-200" variant="outline">
            Pending: {pending.length}
          </Badge>
          <Badge className="bg-green-50 text-green-800 border-green-200" variant="outline">
            Accepted: {approved.length}
          </Badge>
          <Badge className="bg-red-50 text-red-700 border-red-200" variant="outline">
            Rejected: {rejected.length}
          </Badge>
        </div>
      </div>

      {isSearchActive && filtered.length > 0 && (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="p-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">
              Search results ({filtered.length})
              <span className="font-normal text-gray-500 ml-2">
                — all statuses; click a row to open its tab
              </span>
            </div>
            <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
              {filtered.map((c) => {
                const shop = (c.retailerBusinessName ?? "").trim();
                const proprietor = (c.retailerProprietorName ?? "").trim();
                const primary = shop || proprietor || "Retailer";
                const sub =
                  shop && proprietor && shop.toLowerCase() !== proprietor.toLowerCase()
                    ? proprietor
                    : retailerLocationLine(c) || (c.retailerPhone ?? "").trim() || null;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        goToConnectionRow(c);
                        searchInputRef.current?.focus();
                      }}
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{primary}</div>
                        {sub && <div className="text-xs text-gray-500 truncate">{sub}</div>}
                      </div>
                      {statusBadge(c.status)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {showNoResults ? (
        <Card className="border-gray-200 bg-white">
          <CardContent className="py-16 px-6 flex items-center justify-center text-sm text-gray-500">
            No results found
          </CardContent>
        </Card>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            setActiveTab(v as "pending" | "approved" | "rejected")
          }
          className="w-full"
        >
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="pending" className="gap-2">
              Pending
              <Badge
                variant="outline"
                className="bg-yellow-50 text-yellow-800 border-yellow-200"
              >
                {pending.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              Accepted
              <Badge
                variant="outline"
                className="bg-green-50 text-green-800 border-green-200"
              >
                {approved.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              Rejected
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200"
              >
                {rejected.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {loading ? (
              <Card className="border-gray-200 bg-white">
                <CardContent className="p-6 text-sm text-gray-500">
                  Loading...
                </CardContent>
              </Card>
            ) : pending.length === 0 ? (
              <Card className="border-gray-200 bg-white">
                <CardContent className="py-16 px-6 flex items-center justify-center text-sm text-gray-500">
                  {tabEmptyText("pending")}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pending.map((r) => (
                  <RetailerCardRow key={r.id} r={r} tab="pending" />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            {loading ? (
              <Card className="border-gray-200 bg-white">
                <CardContent className="p-6 text-sm text-gray-500">
                  Loading...
                </CardContent>
              </Card>
            ) : approved.length === 0 ? (
              <Card className="border-gray-200 bg-white">
                <CardContent className="py-16 px-6 flex items-center justify-center text-sm text-gray-500">
                  {tabEmptyText("approved")}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {approved.map((r) => (
                  <RetailerCardRow key={r.id} r={r} tab="approved" />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            {loading ? (
              <Card className="border-gray-200 bg-white">
                <CardContent className="p-6 text-sm text-gray-500">
                  Loading...
                </CardContent>
              </Card>
            ) : rejected.length === 0 ? (
              <Card className="border-gray-200 bg-white">
                <CardContent className="py-16 px-6 flex items-center justify-center text-sm text-gray-500">
                  {tabEmptyText("rejected")}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {rejected.map((r) => (
                  <RetailerCardRow key={r.id} r={r} tab="rejected" />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
