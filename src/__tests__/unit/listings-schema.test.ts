import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { listingInput, CONDITIONS } from "@/lib/listings/schema";

const ok = { title: "Calculus textbook", description: "", price: "150", condition: "good", categoryId: "11111111-1111-4111-8111-111111111111" };
describe("listingInput (real schema)", () => {
  it("accepts a minimal valid listing", () => assert.ok(listingInput.safeParse(ok).success));
  it("accepts free items and every condition", () => {
    assert.ok(listingInput.safeParse({ ...ok, price: "0" }).success);
    for (const c of CONDITIONS) assert.ok(listingInput.safeParse({ ...ok, condition: c }).success, c);
  });
  it("accepts an optional campus area and meeting note", () => assert.ok(listingInput.safeParse({ ...ok, campusArea: "Main library", meetingPreferences: "Weekdays after 4pm" }).success));
  it("rejects bad titles, prices, conditions and categories", () => {
    for (const bad of [{ title: "ab" }, { title: "x".repeat(121) }, { price: "-5" }, { price: "1.234" }, { price: "abc" }, { condition: "broken" }, { categoryId: "nope" }, { campusArea: "x".repeat(121) }])
      assert.equal(listingInput.safeParse({ ...ok, ...bad }).success, false, JSON.stringify(bad));
  });
  it("trims the title", () => { const r = listingInput.parse({ ...ok, title: "  Desk  " }); assert.equal(r.title, "Desk"); });
});
