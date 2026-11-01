/** Parse "125" or "125.50" into integer minor units. Returns null if invalid. No floats involved. */
export function parseMinor(input: string): number | null {
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}
export function formatMoney(minor: number, currency: string, locale = "en-ZM") {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);
}
