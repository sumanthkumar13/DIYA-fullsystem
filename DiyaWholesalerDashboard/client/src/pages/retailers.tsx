import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Search,
  MapPin,
  Plus,
} from "lucide-react";
import { fetchRetailers } from "@/services/retailer";
import { fetchRetailerCreditSummary } from "@/services/retailerCredit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AddRetailerModal } from "@/components/retailers/AddRetailerModal";
import { RetailerTierBadge } from "@/components/retailers/RetailerTierBadge";
import { formatINR } from "@/lib/money";
import { matchesRegionFilter } from "@/lib/regions";
import { useRetailerRegions } from "@/hooks/useRetailerRegions";
import { useCardRegionGuard } from "@/hooks/useCardRegionGuard";

type RetailerRow = {
  id: string;
  /** Display name (prefer shop name, fall back to retailer/user name). */
  name: string;
  /** Shop name if known. */
  shopName?: string;
  /** Retailer/user name if separate. */
  retailerName?: string;
  /** Owner/proprietor name if separate. */
  ownerName?: string;
  phone: string;
  location: string;
  /** India Post territory / signup region (used for region filter). */
  region: string;
  initials: string;
  /** Precomputed lowercase search index for fast filtering. */
  searchText: string;
};

type RetailerSortOption = "dues_high" | "dues_low" | "name_az" | "recency";

function formatAmount(n: number): string {
  return formatINR(n);
}

function formatLastOrderDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "--";
  }
}

export default function Retailers() {
  const [retailers, setRetailers] = useState<RetailerRow[]>([]);
  const [creditSummaryMap, setCreditSummaryMap] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<RetailerSortOption>("dues_high");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const { data: regions = [], isLoading: regionsLoading } = useRetailerRegions();
  const [addRetailerOpen, setAddRetailerOpen] = useState(false);

  useCardRegionGuard(filterRegion, regions, regionsLoading, setFilterRegion);
  const [retailersReloadToken, setRetailersReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchRetailers()
      .then((list: any[]) => {
        if (cancelled) return;
        const rows: RetailerRow[] = list.map((c: any) => {
          const shopName = (c.shopName || c.retailerBusinessName || "").toString().trim();
          const retailerName = (c.name || "").toString().trim();
          const ownerName = (c.ownerName || c.proprietorName || c.contactName || "").toString().trim();
          const displayName = shopName || retailerName || ownerName || "Retailer";
          const phone = (c.retailerPhone || c.phone || "").toString().trim() || "--";
          const location = (c.retailerCity || c.location || "").toString().trim() || "--";
          const region = (c.region || "").toString().trim();
          const searchText = [displayName, shopName, retailerName, ownerName, phone]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return {
            id: String(c.retailerId ?? c.id ?? ""),
            name: displayName,
            shopName: shopName || undefined,
            retailerName: retailerName || undefined,
            ownerName: ownerName || undefined,
            phone,
            location,
            region,
            initials: displayName.slice(0, 2).toUpperCase(),
            searchText,
          };
        });
        setRetailers(rows);
        if (rows.length === 0) {
          setIsLoading(false);
          return;
        }

        Promise.all(rows.map((r) => fetchRetailerCreditSummary(r.id).catch(() => null))).then((summaries) => {
          if (cancelled) return;
          const map: Record<string, any> = {};
          rows.forEach((r, i) => {
            const s = summaries[i];
            if (s && r.id)
              map[r.id] = {
                totalOutstanding: s.totalOutstanding,
                overdueDays: s.overdueDays ?? 0,
                lastOrderDate: s.lastOrderDate,
                tier: s.tier,
              };
          });
          setCreditSummaryMap(map);
          setIsLoading(false);
        });
      })
      .catch((err: any) => {
        if (!cancelled) {
          console.error("Failed to load retailers:", err);
          const errorMessage = err?.response?.data?.message || err?.message || "Failed to load retailers list. Please try again.";
          setError(errorMessage);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retailersReloadToken]);

  const filteredRetailers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = q ? retailers.filter((r) => r.searchText.includes(q)) : [...retailers];

    if (filterRegion !== "all") {
      list = list.filter((r) => matchesRegionFilter(r.region, filterRegion));
    }

    const outstanding = (id: string) => Number(creditSummaryMap[id]?.totalOutstanding ?? 0);
    const lastOrderTime = (id: string) => {
      const raw = creditSummaryMap[id]?.lastOrderDate;
      if (!raw) return 0;
      const t = new Date(raw).getTime();
      return Number.isNaN(t) ? 0 : t;
    };

    list.sort((a, b) => {
      switch (sortBy) {
        case "dues_low":
          return outstanding(a.id) - outstanding(b.id);
        case "name_az":
          return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
        case "recency":
          return lastOrderTime(b.id) - lastOrderTime(a.id);
        case "dues_high":
        default:
          return outstanding(b.id) - outstanding(a.id);
      }
    });

    return list;
  }, [retailers, searchQuery, sortBy, filterRegion, creditSummaryMap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Retailers</h1>
          <p className="text-sm text-gray-500">Manage your retailer relationships and collections.</p>
        </div>
        <Button
          className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm"
          onClick={() => {
            setAddRetailerOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Retailer
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Failed to load retailers</p>
          <p>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && retailers.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">Loading retailers...</p>
        </div>
      )}

      {/* Filters */}
      {!isLoading && retailers.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search shop, retailer, owner, or phone…"
              className="pl-10 bg-gray-50 border-gray-200 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as RetailerSortOption)}>
              <SelectTrigger className="w-[160px] bg-gray-50 border-gray-200">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dues_high">Dues: High to Low</SelectItem>
                <SelectItem value="dues_low">Dues: Low to High</SelectItem>
                <SelectItem value="name_az">Name: A-Z</SelectItem>
                <SelectItem value="recency">Recently Active</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRegion} onValueChange={setFilterRegion} disabled={regionsLoading}>
              <SelectTrigger className="w-[180px] bg-gray-50 border-gray-200">
                <SelectValue placeholder={regionsLoading ? "Loading regions…" : "Region"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Retailers List */}
      {!isLoading && retailers.length === 0 && !error && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">No retailers found</p>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {filteredRetailers.map((retailer) => {
          const summary = creditSummaryMap[retailer.id];
          const overdueDays = summary?.overdueDays ?? 0;
          const isOverdue = overdueDays > 0;
          return (
            <Link key={retailer.id} href={`/retailers/${retailer.id}`}>
              <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/30 cursor-pointer border-gray-200 bg-white">
                <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex items-start gap-4 min-w-[280px]">
                    <Avatar className="h-12 w-12 rounded-lg border border-gray-100">
                      <AvatarFallback className="bg-gray-100 text-gray-600 font-bold rounded-lg">{retailer.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{retailer.name}</h3>
                        <RetailerTierBadge tier={summary?.tier} />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span>{retailer.ownerName || retailer.retailerName || retailer.name}</span>
                        <span className="h-1 w-1 rounded-full bg-gray-300" />
                        <span>{retailer.phone}</span>
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {retailer.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t lg:border-t-0 border-gray-100 pt-4 lg:pt-0">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Outstanding Due</p>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{summary != null ? formatAmount(Number(summary.totalOutstanding ?? 0)) : "--"}</p>
                        {isOverdue && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-100 text-[10px] px-1.5 py-0 h-5">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      {isOverdue && (
                        <p className="text-xs text-red-600 mt-0.5">{overdueDays} days overdue</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Avg Delay</p>
                      <p className={isOverdue ? "font-medium text-red-600" : "font-medium text-gray-700"}>
                        {summary != null ? `${overdueDays} days` : "--"}
                      </p>
                    </div>

                    <div className="hidden sm:block">
                      <p className="text-xs text-gray-500 mb-1">Last Order</p>
                      <p className="font-medium text-gray-700 text-sm">{summary != null ? formatLastOrderDate(summary.lastOrderDate) : "--"}</p>
                    </div>
                  </div>

                  {isOverdue && (
                    <div className="flex items-center justify-end lg:w-auto border-t lg:border-t-0 border-gray-100 pt-4 lg:pt-0">
                      <Button
                        size="sm"
                        className="h-9 gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                        onClick={(e) => e.preventDefault()}
                      >
                        Request Payment
                      </Button>
                    </div>
                  )}

                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      <AddRetailerModal
        open={addRetailerOpen}
        onClose={() => setAddRetailerOpen(false)}
        onCreated={() => setRetailersReloadToken((t) => t + 1)}
      />
    </div>
  );
}
