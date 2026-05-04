import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TIER_STYLES: Record<string, string> = {
  BEGINNER: "bg-slate-100 text-slate-700 border-slate-200",
  BRONZE: "bg-amber-100 text-amber-900 border-amber-300",
  SILVER: "bg-gray-200 text-gray-800 border-gray-400",
  GOLD: "bg-yellow-100 text-yellow-900 border-yellow-400",
  DIAMOND: "bg-violet-100 text-violet-900 border-violet-300",
};

const TIER_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  DIAMOND: "Diamond",
};

export function RetailerTierBadge({
  tier,
  className,
}: {
  tier?: string | null;
  className?: string;
}) {
  const key = (tier || "").toUpperCase();
  if (!key || key === "BEGINNER") return null;
  const label = TIER_LABELS[key] || key;
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold text-xs shrink-0",
        TIER_STYLES[key] || "bg-slate-100 text-slate-700 border-slate-200",
        className
      )}
    >
      {label}
    </Badge>
  );
}
