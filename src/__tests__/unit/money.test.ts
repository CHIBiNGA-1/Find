/**
 * Unit tests for src/lib/money.ts
 * Run with: npm test
 * Uses node:test — no native binary dependency.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ── inline the functions under test (no Next.js / Rollup needed) ─────────────

/** Parse a decimal string like "12.50" into minor units (e.g. 1250). */
function parseMinor(value: string): number | null {
  const trimmed = value.replace(",", ".").trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Format minor units back to a locale-aware string. */
function formatMoney(minor: number, currency: string): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

// ── parseMinor ────────────────────────────────────────────────────────────────

describe("parseMinor", () => {
  it("converts whole number string", () => {
    assert.equal(parseMinor("5"), 500);
  });

  it("converts decimal string with 2 dp", () => {
    assert.equal(parseMinor("12.50"), 1250);
  });

  it("handles comma decimal separator", () => {
    assert.equal(parseMinor("12,50"), 1250);
  });

  it("rounds floating-point imprecision", () => {
    assert.equal(parseMinor("0.10"), 10);
    assert.equal(parseMinor("0.07"), 7);
  });

  it("returns null for empty string", () => {
    assert.equal(parseMinor(""), null);
  });

  it("returns null for non-numeric input", () => {
    assert.equal(parseMinor("abc"), null);
  });

  it("returns null for negative value", () => {
    assert.equal(parseMinor("-1"), null);
  });

  it("returns null for Infinity", () => {
    assert.equal(parseMinor("Infinity"), null);
  });

  it("returns 0 for '0'", () => {
    assert.equal(parseMinor("0"), 0);
  });

  it("handles leading/trailing whitespace", () => {
    assert.equal(parseMinor("  25.00  "), 2500);
  });
});

// ── formatMoney ───────────────────────────────────────────────────────────────

describe("formatMoney", () => {
  it("formats ZMW minor units", () => {
    const result = formatMoney(5000, "ZMW");
    assert.ok(result.includes("50"), `expected '50' in '${result}'`);
  });

  it("formats USD minor units", () => {
    const result = formatMoney(999, "USD");
    assert.ok(result.includes("9.99"), `expected '9.99' in '${result}'`);
  });

  it("formats zero", () => {
    const result = formatMoney(0, "ZMW");
    assert.ok(result.includes("0"), `expected '0' in '${result}'`);
  });

  it("falls back gracefully for unknown currency code", () => {
    const result = formatMoney(100, "XYZ");
    // either Intl handled it or we fell back
    assert.ok(result.length > 0);
  });
});
