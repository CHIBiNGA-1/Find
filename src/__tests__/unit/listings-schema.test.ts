/**
 * Unit tests for listing Zod schema validation
 * Run with: npm test  (uses node:test, no native binary deps)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// ── Inline the schema (mirrors src/lib/listings/schema.ts) ───────────────────

const CONDITIONS = ["new", "like_new", "good", "fair", "poor"] as const;

const listingSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(120),
  description: z.string().max(4000).default(""),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price.")
    .refine((v) => parseFloat(v) >= 0, "Price cannot be negative.")
    .refine((v) => parseFloat(v) < 1_000_000, "Price is too high."),
  condition: z.enum(CONDITIONS),
  category_id: z.string().uuid("Select a category.").optional(),
  meeting_preferences: z.string().max(500).optional(),
});

type ListingInput = z.infer<typeof listingSchema>;

function parse(input: unknown): { success: boolean; error?: string } {
  const result = listingSchema.safeParse(input);
  if (result.success) return { success: true };
  return { success: false, error: result.error.issues[0]?.message };
}

// ── Valid listing ─────────────────────────────────────────────────────────────

describe("listingSchema — valid inputs", () => {
  it("accepts a minimal valid listing", () => {
    const r = parse({ title: "Maths Textbook", price: "50.00", condition: "good" });
    assert.ok(r.success, r.error);
  });

  it("accepts price with no decimal", () => {
    const r = parse({ title: "Laptop Stand", price: "350", condition: "new" });
    assert.ok(r.success, r.error);
  });

  it("accepts price of 0 (free item)", () => {
    const r = parse({ title: "Old Notes", price: "0", condition: "fair" });
    assert.ok(r.success, r.error);
  });

  it("accepts all condition values", () => {
    for (const cond of CONDITIONS) {
      const r = parse({ title: "Item", price: "10.00", condition: cond });
      assert.ok(r.success, `condition '${cond}' should be valid`);
    }
  });

  it("trims title whitespace", () => {
    const result = listingSchema.safeParse({ title: "  My Book  ", price: "5.00", condition: "good" });
    assert.ok(result.success);
    assert.equal((result.data as ListingInput).title, "My Book");
  });
});

// ── Invalid listing ───────────────────────────────────────────────────────────

describe("listingSchema — invalid inputs", () => {
  it("rejects title shorter than 3 characters", () => {
    const r = parse({ title: "Hi", price: "10.00", condition: "good" });
    assert.ok(!r.success);
    assert.match(r.error!, /3 characters/);
  });

  it("rejects title longer than 120 characters", () => {
    const r = parse({ title: "A".repeat(121), price: "10.00", condition: "good" });
    assert.ok(!r.success);
  });

  it("rejects negative price", () => {
    const r = parse({ title: "Item", price: "-5.00", condition: "good" });
    assert.ok(!r.success);
  });

  it("rejects price >= 1,000,000", () => {
    const r = parse({ title: "Item", price: "1000000.00", condition: "good" });
    assert.ok(!r.success);
  });

  it("rejects non-numeric price", () => {
    const r = parse({ title: "Item", price: "abc", condition: "good" });
    assert.ok(!r.success);
    assert.match(r.error!, /valid price/);
  });

  it("rejects price with 3 decimal places", () => {
    const r = parse({ title: "Item", price: "10.123", condition: "good" });
    assert.ok(!r.success);
  });

  it("rejects unknown condition", () => {
    const r = parse({ title: "Item", price: "10.00", condition: "excellent" });
    assert.ok(!r.success);
  });

  it("rejects missing title", () => {
    const r = parse({ price: "10.00", condition: "good" });
    assert.ok(!r.success);
  });

  it("rejects invalid category UUID", () => {
    const r = parse({ title: "Item", price: "10.00", condition: "good", category_id: "not-a-uuid" });
    assert.ok(!r.success);
    assert.match(r.error!, /category/i);
  });
});
