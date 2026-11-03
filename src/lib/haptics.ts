/** A short tick on Android. iOS ignores it, which is fine. */
export function tap(ms = 8) {
  try { navigator.vibrate?.(ms); } catch { /* unsupported */ }
}
