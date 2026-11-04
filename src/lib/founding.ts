/** Pure helpers for the founding period. The numbers themselves live in the database (founding_terms()). */
export function daysLeft(endsAt: string | Date, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 86_400_000));
}
export function progressPercent(members: number, target: number): number {
  return Math.min(100, Math.round((members / Math.max(target, 1)) * 100));
}
export type FoundingError = { code: "similar" | "exists" | "already_founded" | "already_member" | "invalid_name" | "failed"; name?: string };
export function parseFoundingError(message: string): FoundingError {
  const similar = /similar_exists:(.+)$/.exec(message);
  if (similar) return { code: "similar", name: similar[1]!.trim() };
  if (message.includes("already_founded")) return { code: "already_founded" };
  if (message.includes("already_member")) return { code: "already_member" };
  if (message.includes("invalid_name")) return { code: "invalid_name" };
  if (/\bexists\b/.test(message)) return { code: "exists" };
  return { code: "failed" };
}
