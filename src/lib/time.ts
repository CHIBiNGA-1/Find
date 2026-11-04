/** "just now", "5m ago", "2h ago", "3d ago", then a short date. */
export function timeAgo(iso: string | null | undefined, now = Date.now(), timeZone = "UTC"): string {
  if (!iso) return "";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(iso, timeZone);
}

/** Timestamps are stored in UTC and shown in the university's timezone, never the server's. */
export function formatDate(iso: string, timeZone = "UTC", withYear = false): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone }).format(new Date(iso));
}
export function formatTime(iso: string, timeZone = "UTC"): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(new Date(iso));
}
/** A calendar date with no time ("2026-11-03") has no timezone: format it as written. */
export function formatCalendarDate(ymd: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${ymd}T00:00:00Z`));
}
