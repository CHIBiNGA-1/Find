import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requestInput, lostFoundInput } from "@/lib/campus/schema";

describe("requestInput (real schema)", () => {
  const ok = { title: "Need a scientific calculator", description: "", categoryId: "", budget: "", days: "14" };
  it("accepts a blank budget and a decimal budget", () => {
    assert.ok(requestInput.safeParse(ok).success); assert.ok(requestInput.safeParse({ ...ok, budget: "80.50" }).success);
  });
  it("only allows 7, 14 or 30 days", () => {
    for (const d of ["7", "14", "30"]) assert.ok(requestInput.safeParse({ ...ok, days: d }).success);
    for (const d of ["0", "31", "abc"]) assert.equal(requestInput.safeParse({ ...ok, days: d }).success, false);
  });
  it("rejects short titles and bad budgets", () => {
    assert.equal(requestInput.safeParse({ ...ok, title: "ab" }).success, false);
    assert.equal(requestInput.safeParse({ ...ok, budget: "lots" }).success, false);
  });
});
describe("lostFoundInput (real schema)", () => {
  const ok = { kind: "lost", title: "Blue water bottle", description: "Dented lid", area: "Library", occurredOn: "2026-11-01", imagePath: null };
  it("accepts lost and found reports", () => { assert.ok(lostFoundInput.safeParse(ok).success); assert.ok(lostFoundInput.safeParse({ ...ok, kind: "found" }).success); });
  it("rejects unknown kinds, short titles and malformed dates", () => {
    for (const bad of [{ kind: "stolen" }, { title: "ab" }, { occurredOn: "03/11/2026" }, { area: "x" }]) assert.equal(lostFoundInput.safeParse({ ...ok, ...bad }).success, false, JSON.stringify(bad));
  });
  it("blocks long digit runs that look like ID or student numbers", () => {
    assert.equal(lostFoundInput.safeParse({ ...ok, description: "Student no 2019 123 456" }).success, false);
    assert.equal(lostFoundInput.safeParse({ ...ok, title: "Card 1234567" }).success, false);
  });
});
