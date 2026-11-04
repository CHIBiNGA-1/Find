/** Parse "125", "125.50" or "125,50" into integer minor units. Returns null if invalid. No floats involved. */
export function parseMinor(input: string): number | null {
  const s = input.trim().replace(/^(\d{1,9}),(\d{1,2})$/, "$1.$2");
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** Exact inverse of parseMinor for form fields: 12345 -> "123.45", 12300 -> "123". */
export function minorToInput(minor: number): string {
  const whole = Math.trunc(minor / 100), cents = minor % 100;
  return cents ? `${whole}.${String(cents).padStart(2, "0")}` : String(whole);
}

export function formatMoney(minor: number, currency: string, locale = "en-ZM") {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);
}
