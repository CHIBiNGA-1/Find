import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { timeAgo, formatDate, formatTime, formatCalendarDate } from "@/lib/time";
import { moveItem, roomFor } from "@/lib/listings/images";
import { categoryTree, topLevelOf } from "@/lib/categories";

describe("time", () => {
  const now = Date.parse("2026-11-04T12:00:00Z");
  it("buckets relative time", () => {
    assert.equal(timeAgo("2026-11-04T11:59:40Z", now), "just now"); assert.equal(timeAgo("2026-11-04T11:55:00Z", now), "5m ago");
    assert.equal(timeAgo("2026-11-04T09:00:00Z", now), "3h ago"); assert.equal(timeAgo("2026-11-01T12:00:00Z", now), "3d ago");
  });
  it("shows absolute dates in the university timezone, not the server's", () => {
    assert.equal(formatTime("2026-11-04T22:30:00Z", "Africa/Lusaka"), "00:30");   // UTC+2
    assert.equal(formatDate("2026-11-04T23:30:00Z", "Africa/Lusaka"), "5 Nov");
    assert.equal(formatDate("2026-11-04T23:30:00Z", "UTC"), "4 Nov");
  });
  it("formats calendar dates without timezone drift", () => assert.equal(formatCalendarDate("2026-11-03"), "3 Nov 2026"));
});
describe("image ordering", () => {
  it("moves items without mutating the input", () => { const a = [1, 2, 3, 4]; assert.deepEqual(moveItem(a, 3, 0), [4, 1, 2, 3]); assert.deepEqual(a, [1, 2, 3, 4]); });
  it("clamps and ignores bad indexes", () => { assert.deepEqual(moveItem([1, 2, 3], 0, 99), [2, 3, 1]); assert.deepEqual(moveItem([1, 2, 3], 7, 0), [1, 2, 3]); });
  it("limits additions to eight photos", () => { assert.equal(roomFor(6, 5), 2); assert.equal(roomFor(8, 3), 0); assert.equal(roomFor(0, 3), 3); });
});
describe("categories", () => {
  const rows = [{ id: "a", slug: "a", name: "Zeta", parent_id: null }, { id: "b", slug: "b", name: "Alpha", parent_id: null }, { id: "c", slug: "c", name: "Child", parent_id: "a" }];
  it("nests children under sorted parents", () => { const t = categoryTree(rows); assert.deepEqual(t.map((n) => n.name), ["Alpha", "Zeta"]); assert.equal(t[1]!.children[0]!.name, "Child"); });
  it("always sorts the catch-all \"other\" category last", () => {
    const t = categoryTree([{ id: "o", slug: "other", name: "Other", parent_id: null }, { id: "z", slug: "z", name: "Zebra", parent_id: null }]);
    assert.deepEqual(t.map((n) => n.slug), ["z", "other"]);
  });
  it("finds the top-level category", () => { assert.equal(topLevelOf(rows, "c"), "a"); assert.equal(topLevelOf(rows, "b"), "b"); assert.equal(topLevelOf(rows, "zz"), null); });
});
