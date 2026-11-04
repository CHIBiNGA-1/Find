/** Returns a same-origin path or the fallback. Rejects protocol-relative ("//x"), backslash ("/\x") and control-character tricks. */
export function safeNext(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}
