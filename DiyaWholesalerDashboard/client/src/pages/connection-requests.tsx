import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  RefreshCcw,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ConnectionStatus = "PENDING" | "APPROVED" | "REJECTED";

type ConnectionRequestDTO = {
  id: string;
  status: ConnectionStatus;
  requestedAt?: string;

  retailerId?: string;
  retailerBusinessName?: string;
  retailerCity?: string;
  retailerPhone?: string;
};

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
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionRequestDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter((r) => {
      const name = (r.retailerBusinessName ?? "").toLowerCase();
      const city = (r.retailerCity ?? "").toLowerCase();
      const phone = (r.retailerPhone ?? "").toLowerCase();
      return name.includes(q) || city.includes(q) || phone.includes(q);
    });
  }, [connections, searchQuery]);

  const pending = useMemo(
    () => filtered.filter((c) => c.status === "PENDING"),
    [filtered]
  );
  const approved = useMemo(
    () => filtered.filter((c) => c.status === "APPROVED"),
    [filtered]
  );
  const rejected = useMemo(
    () => filtered.filter((c) => c.status === "REJECTED"),
    [filtered]
  );

  async function load() {
    try {
      setError(null);
      setLoading(true);

      // ✅ New endpoint (recommended)
      // backend should return all statuses for wholesaler
      const res = await api.get("/wholesaler/connections");
      setConnections(res.data);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? e?.message ?? "Failed to load connections"
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: "APPROVED" | "REJECTED") {
    try {
      setUpdatingId(id);
      await api.put(`/wholesaler/connections/${id}`, { status });

      // ✅ update locally
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
    } catch (e: any) {
      alert(
        e?.response?.data?.message ?? e?.message ?? "Failed to update request"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function Section({
    title,
    count,
    emptyText,
    items,
    type,
  }: {
    title: string;
    count: number;
    emptyText: string;
    items: ConnectionRequestDTO[];
    type: ConnectionStatus;
  }) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            {title}
          </h2>
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            {count}
          </Badge>
        </div>

        {loading ? (
          <Card className="border-gray-200 bg-white">
            <CardContent className="p-6 text-sm text-gray-500">
              Loading...
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="border-gray-200 bg-white">
            <CardContent className="p-6 text-sm text-gray-500">
              {emptyText}
            </CardContent>
          </Card>
        ) : (
          items.map((r) => {
            const name = r.retailerBusinessName || "Retailer";
            const city = r.retailerCity || "Unknown city";
            const phone = r.retailerPhone || "";

            return (
              <Card
                key={r.id}
                className="hover:shadow-md transition-all duration-200 hover:border-primary/30 border-gray-200 bg-white"
              >
                <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-extrabold">
                      {name.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">
                        {name}
                      </h3>

                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {city}
                      </p>

                      {phone && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" /> {phone}
                        </p>
                      )}
                    </div>

                    {statusBadge(r.status)}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <p className="text-xs text-gray-400">
                      Connection ID: {r.id}
                    </p>

                    {/* Actions only for pending */}
                    {type === "PENDING" ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-2 text-red-600 border-red-200 hover:bg-red-50"
                          disabled={updatingId === r.id}
                          onClick={() => updateStatus(r.id, "REJECTED")}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>

                        <Button
                          size="sm"
                          className="h-9 gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                          disabled={updatingId === r.id}
                          onClick={() => updateStatus(r.id, "APPROVED")}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    ) : type === "REJECTED" ? (
                      <Button
                        size="sm"
                        className="h-9 gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                        disabled={updatingId === r.id}
                        onClick={() => updateStatus(r.id, "APPROVED")}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Re-Approve
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
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

        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
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

        <div className="flex items-center gap-3 w-full md:w-auto">
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

      {/* 3 Column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section
          title="Pending Retailers"
          count={pending.length}
          emptyText="No pending requests."
          items={pending}
          type="PENDING"
        />
        <Section
          title="Approved Retailers"
          count={approved.length}
          emptyText="No approved retailers yet."
          items={approved}
          type="APPROVED"
        />
        <Section
          title="Rejected Retailers"
          count={rejected.length}
          emptyText="No rejected retailers."
          items={rejected}
          type="REJECTED"
        />
      </div>
    </div>
  );
}
