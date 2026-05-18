/** First non-empty trimmed string from candidates. */
export function pickFirstString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Account email: prefer wholesaler settings (source of truth), then auth/user payload. */
export function getAccountEmail(
  user: Record<string, unknown> | null | undefined,
  settingsEmail?: string | null,
): string {
  return pickFirstString(
    settingsEmail,
    user?.email,
    (user as { user?: { email?: string } })?.user?.email,
    (user as { profile?: { email?: string } })?.profile?.email,
  );
}

/** Merge `/users/me` (or settings) fields into the auth user object. */
export function mergeAuthProfile(
  prev: Record<string, unknown> | null,
  source: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!prev || !source) return prev;
  const next = { ...prev };
  let changed = false;

  const apply = (key: string, raw: unknown) => {
    if (typeof raw !== "string" || !raw.trim()) return;
    const val = raw.trim();
    if (next[key] !== val) {
      next[key] = val;
      changed = true;
    }
  };

  apply("email", source.email);
  apply("phone", source.phone);
  apply("name", source.name ?? source.ownerName);
  apply("avatarUrl", source.avatarUrl);
  if (source.role != null) {
    const role =
      typeof source.role === "string" ? source.role : String((source.role as { name?: string }).name ?? "");
    if (role && next.role !== role) {
      next.role = role;
      changed = true;
    }
  }

  return changed ? next : prev;
}
