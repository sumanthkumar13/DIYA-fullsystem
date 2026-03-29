export type GreetingPeriod = "morning" | "afternoon" | "evening";

export function getGreetingPeriod(now: Date = new Date()): GreetingPeriod {
  const hour = now.getHours(); // 0-23
  // Morning: 05:00 – 11:59
  if (hour >= 5 && hour < 12) return "morning";
  // Afternoon: 12:00 – 16:59
  if (hour >= 12 && hour < 17) return "afternoon";
  // Evening: 17:00 – 04:59
  return "evening";
}

export function getGreeting(now: Date = new Date()): string {
  const period = getGreetingPeriod(now);
  if (period === "morning") return "Good Morning";
  if (period === "afternoon") return "Good Afternoon";
  return "Good Evening";
}

export function formatDisplayName(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((part) => {
      const p = part.trim();
      if (!p) return "";
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .filter(Boolean)
    .join(" ");
}

export function getUserDisplayName(user: any): string {
  // Prefer explicit name fields (login response / JWT payload)
  const candidate =
    user?.name ??
    user?.userName ??
    user?.fullName ??
    user?.businessName ??
    user?.user?.name ??
    user?.user?.fullName ??
    user?.profile?.name ??
    user?.profile?.fullName;

  return formatDisplayName(candidate);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

