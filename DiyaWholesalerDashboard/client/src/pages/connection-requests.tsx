import { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  RefreshCcw,
  MapPin,
  Phone,
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

type ConnectionRequestDTO = {
  id: string;
  status: ConnectionStatus;
  requestedAt?: string;

  retailerId?: string;
  retailerBusinessName?: string;
  retailerCity?: string;
  retailerRegion?: string;
  retailerState?: string;
  retailerPhone?: string;
};

function retailerLocationLine(r: ConnectionRequestDTO): string | null {
  const parts = [r.retailerCity, r.retailerRegion, r.retailerState]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function statusBadge(status: ConnectionStatus) {
  switch (status) {
    case "PENDING":
      return (
        <Badge
          variant="outline"
          className="bg-yellow-50 text-yellow-800 border-yellow-200"
        >
          Pending Approval
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-800 border-green-200"
        >
          Approved
        </Badge>
      );
    case "BLOCKED":
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-800 border-amber-200"
        >
          Blocked
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200"
        >
          Rejected
        </Badge>
      );
  }
}

export default function ConnectionRequestsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const {
    data: connections = [],
    isLoading: loading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["wholesaler-connections"],
    queryFn: async () => {
      const res = await api.get("/wholesaler/connections");
      return res.data as ConnectionRequestDTO[];
    },
    onSuccess: () => {
      setLastUpdatedAt(new Date());
    },
  });

  const refreshLoading = loading || isRefreshing || isFetching;

  const errMessage =
    isError && error
      ? (error as any)?.response?.data?.message ??
        (error instanceof Error ? error.message : "Failed to load connections")
      : null;

  function formatLastUpdated(value: Date | null) {
    if (!value) return null;
    const time = value.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `Last updated: ${time}`;
  }

  async function handleRefresh() {
    try {
      setIsRefreshing(true);
      await queryClient.invalidateQueries({ queryKey: ["wholesaler-connections"] });
      await refetch();
      setLastUpdatedAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter((r) => {
      const name = (r.retailerBusinessName ?? "").toLowerCase();
      const loc = (retailerLocationLine(r) ?? "").toLowerCase();
      const phone = (r.retailerPhone ?? "").toLowerCase();
      return name.includes(q) || loc.includes(q) || phone.includes(q);
    });
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
        return "No pending requests";
      case "approved":
        return "No approved retailers yet";
      case "rejected":
        return "No rejected retailers";
    }
  }

  function profileHrefFor(r: ConnectionRequestDTO): string | null {
    if (!r.retailerId) return null;
    if (r.status !== "APPROVED" && r.status !== "BLOCKED") return null;
    return `/retailers/${r.retailerId}`;
  }

  function RetailerCardRow({
    r,
    tab,
  }: {
    r: ConnectionRequestDTO;
    tab: typeof activeTab;
  }) {
    const name = (r.retailerBusinessName ?? "").trim() || "Retailer";
    const location = retailerLocationLine(r);
    const phone = (r.retailerPhone ?? "").trim();
    const href = profileHrefFor(r);

    const card = (
      <Card
        className={cn(
          "border-gray-200 bg-white transition-all duration-200 hover:shadow-md hover:border-primary/30",
          href ? "cursor-pointer" : "cursor-pointer"
        )}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-start gap-2">
                <h3 className="font-semibold text-gray-900 text-base sm:text-lg leading-snug truncate">
                  {name}
                </h3>
              </div>
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
          {formatLastUpdated(lastUpdatedAt) ? (
            <div className="text-xs text-gray-500">{formatLastUpdated(lastUpdatedAt)}</div>
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
          <Input
            placeholder="Search retailer name, city, phone..."
            className="bg-gray-50 border-gray-200 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <Badge className="bg-gray-50 text-gray-700 border-gray-200" variant="outline">
            Total: {filtered.length}
          </Badge>
          <Badge className="bg-yellow-50 text-yellow-800 border-yellow-200" variant="outline">
            Pending: {pending.length}
          </Badge>
          <Badge className="bg-green-50 text-green-800 border-green-200" variant="outline">
            Approved: {approved.length}
          </Badge>
          <Badge className="bg-red-50 text-red-700 border-red-200" variant="outline">
            Rejected: {rejected.length}
          </Badge>
        </div>
      </div>

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
              Approved
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
