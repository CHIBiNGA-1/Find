/**
 * Unit tests for campus schema validation (requests + lost & found)
 * Run with: npm test  (uses node:test, no native binary deps)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// ── Request schema (mirrors src/lib/campus/schema.ts) ─────────────────────────

const requestSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().max(2000).default(""),
  budget: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d+(\.\d{1,2})?$/.test(v),
      "Enter a valid budget or leave blank.",
    ),
  expires_days: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(30)),
});

// ── Lost-and-found schema ─────────────────────────────────────────────────────

const KINDS = ["lost", "found"] as const;

const lostFoundSchema = z.object({
  kind: z.enum(KINDS),
  title: z.string().trim().min(3).max(120),
  description: z.string().max(2000).default(""),
  area: z.string().trim().max(100).default(""),
  occurred_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.")
    .refine((v) => !isNaN(Date.parse(v)), "Invalid date."),
});

function parseReq(input: unknown) {
  const r = requestSchema.safeParse(input);
  return { success: r.success, error: r.success ? undefined : r.error.issues[0]?.message };
}
function parseLF(input: unknown) {
  const r = lostFoundSchema.safeParse(input);
  return { success: r.success, error: r.success ? undefined : r.error.issues[0]?.message };
}

// ── Request tests ─────────────────────────────────────────────────────────────

describe("requestSchema — valid inputs", () => {
  it("accepts a valid request with numeric expiry", () => {
    const r = parseReq({ title: "Need a Calculator", expires_days: "7" });
    assert.ok(r.success, r.error);
  });

  it("accepts optional blank budget", () => {
    const r = parseReq({ title: "ISO Laptop", expires_days: "14", budget: "" });
    assert.ok(r.success, r.error);
  });

  it("accepts budget with 2 decimal places", () => {
    const r = parseReq({ title: "ISO Laptop", expires_days: "14", budget: "250.00" });
    assert.ok(r.success, r.error);
  });

  it("transforms expires_days string to number", () => {
    const r = requestSchema.safeParse({ title: "ISO Laptop", expires_days: "7" });
    assert.ok(r.success);
    assert.equal(typeof (r.data as { expires_days: number }).expires_days, "number");
  });
});

describe("requestSchema — invalid inputs", () => {
  it("rejects title shorter than 3 chars", () => {
    const r = parseReq({ title: "Hi", expires_days: "7" });
    assert.ok(!r.success);
  });

  it("rejects expiry of 0 days", () => {
    const r = parseReq({ title: "ISO Laptop", expires_days: "0" });
    assert.ok(!r.success);
  });

  it("rejects expiry > 30 days", () => {
    const r = parseReq({ title: "ISO Laptop", expires_days: "31" });
    assert.ok(!r.success);
  });

  it("rejects non-numeric budget", () => {
    const r = parseReq({ title: "ISO Laptop", expires_days: "7", budget: "lots" });
    assert.ok(!r.success);
    assert.match(r.error!, /budget/i);
  });
});

// ── Lost-and-found tests ──────────────────────────────────────────────────────

describe("lostFoundSchema — valid inputs", () => {
  it("accepts a lost report", () => {
    const r = parseLF({ kind: "lost", title: "Blue Water Bottle", occurred_on: "2024-10-15" });
    assert.ok(r.success, r.error);
  });

  it("accepts a found report", () => {
    const r = parseLF({ kind: "found", title: "University ID Card", occurred_on: "2024-10-20" });
    assert.ok(r.success, r.error);
  });

  it("accepts area and description", () => {
    const r = parseLF({
      kind: "lost", title: "Blue Pen", area: "Library 3rd floor", occurred_on: "2024-11-01",
      description: "Parker ballpoint, blue ink.",
    });
    assert.ok(r.success, r.error);
  });
});

describe("lostFoundSchema — invalid inputs", () => {
  it("rejects unknown kind", () => {
    const r = parseLF({ kind: "stolen", title: "My Bike", occurred_on: "2024-10-01" });
    assert.ok(!r.success);
  });

  it("rejects short title", () => {
    const r = parseLF({ kind: "lost", title: "Mh", occurred_on: "2024-10-01" });
    assert.ok(!r.success);
  });

  it("rejects malformed date", () => {
    const r = parseLF({ kind: "lost", title: "Notebook", occurred_on: "01-10-2024" });
    assert.ok(!r.success);
    assert.match(r.error!, /YYYY-MM-DD/);
  });

  it("rejects invalid calendar date", () => {
    const r = parseLF({ kind: "lost", title: "Notebook", occurred_on: "2024-13-45" });
    assert.ok(!r.success);
  });
});

// ── Status transition invariants (pure logic) ─────────────────────────────────

describe("status transition rules", () => {
  const validListingTransitions: Record<string, string[]> = {
    draft:    ["active"],
    active:   ["archived", "sold"],
    archived: ["active"],
    sold:     [],
    removed:  [],
  };

  function canTransition(from: string, to: string): boolean {
    return (validListingTransitions[from] ?? []).includes(to);
  }

  it("draft → active is valid", ()   => { assert.ok(canTransition("draft", "active")); });
  it("active → sold is valid", ()    => { assert.ok(canTransition("active", "sold")); });
  it("active → archived is valid", () => { assert.ok(canTransition("active", "archived")); });
  it("archived → active is valid", () => { assert.ok(canTransition("archived", "active")); });
  it("sold → active is NOT valid", ()  => { assert.ok(!canTransition("sold", "active")); });
  it("sold → archived is NOT valid", () => { assert.ok(!canTransition("sold", "archived")); });
  it("removed → active is NOT valid", () => { assert.ok(!canTransition("removed", "active")); });

  const validRequestTransitions: Record<string, string[]> = {
    open:      ["fulfilled", "closed"],
    fulfilled: [],
    closed:    [],
  };

  function canTransitionReq(from: string, to: string): boolean {
    return (validRequestTransitions[from] ?? []).includes(to);
  }

  it("open request → fulfilled is valid", ()   => { assert.ok(canTransitionReq("open", "fulfilled")); });
  it("open request → closed is valid", ()      => { assert.ok(canTransitionReq("open", "closed")); });
  it("fulfilled request → open is NOT valid", () => { assert.ok(!canTransitionReq("fulfilled", "open")); });
  it("closed request → open is NOT valid", ()   => { assert.ok(!canTransitionReq("closed", "open")); });
});
