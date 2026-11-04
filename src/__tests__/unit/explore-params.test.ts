import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseExplore, exploreHref } from "@/lib/explore-params";

const U = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";
describe("parseExplore", () => {
  it("returns safe defaults for empty input", () => assert.deepEqual(parseExplore({}), { q: null, cat: null, min: null, max: null, conds: [], sort: "new", cursor: null }));
  it("swaps a reversed price range instead of returning nothing", () => { const r = parseExplore({ min: "500", max: "100" }); assert.equal(r.min, 10000); assert.equal(r.max, 50000); });
  it("drops invalid category, condition, sort and price values", () => {
    const r = parseExplore({ cat: "not-a-uuid", cond: ["good", "weird", "good"], sort: "random", min: "abc" });
    assert.equal(r.cat, null); assert.deepEqual(r.conds, ["good"]); assert.equal(r.sort, "new"); assert.equal(r.min, null);
  });
  it("trims and caps the search text", () => { assert.equal(parseExplore({ q: "  desk  " }).q, "desk"); assert.equal(parseExplore({ q: "x".repeat(300) }).q!.length, 100); });
  it("accepts a valid keyset cursor and rejects a malformed one", () => {
    assert.deepEqual(parseExplore({ at: "2026-11-01T10:00:00Z", after: U }).cursor, { at: "2026-11-01T10:00:00.000Z", id: U, price: null, offset: null });
    assert.equal(parseExplore({ at: "yesterday", after: U }).cursor, null);
    assert.equal(parseExplore({ at: "2026-11-01T10:00:00Z", after: "x" }).cursor, null);
  });
  it("uses the price cursor for price sorts", () => {
    assert.deepEqual(parseExplore({ sort: "price_asc", price: "2500", after: U }).cursor, { at: null, id: U, price: 2500, offset: null });
    assert.equal(parseExplore({ sort: "price_asc", after: U }).cursor, null);
  });
});
describe("relevance sort", () => {
  it("defaults to relevance when there is a search term, newest otherwise", () => {
    assert.equal(parseExplore({ q: "desk" }).sort, "relevant"); assert.equal(parseExplore({}).sort, "new");
  });
  it("ignores an explicit relevance sort when there is nothing to rank", () => assert.equal(parseExplore({ sort: "relevant" }).sort, "new"));
  it("lets an explicit sort win over the default", () => assert.equal(parseExplore({ q: "desk", sort: "price_desc" }).sort, "price_desc"));
  it("pages by offset, and rejects junk offsets", () => {
    assert.deepEqual(parseExplore({ q: "desk", off: "24" }).cursor, { at: null, id: null, price: null, offset: 24 });
    for (const bad of ["-1", "abc", "1e3", "123456"]) assert.equal(parseExplore({ q: "desk", off: bad }).cursor, null, bad);
  });
  it("keeps the offset only when asked", () => {
    assert.equal(exploreHref({ q: "a", off: "24" }, {}, true), "/explore?q=a&off=24");
    assert.equal(exploreHref({ q: "a", off: "24" }), "/explore?q=a");
  });
});
describe("exploreHref", () => {
  it("keeps filters, applies overrides and drops the cursor", () => {
    assert.equal(exploreHref({ q: "desk", min: "10", at: "x", after: "y" }, { sort: "price_asc" }), "/explore?q=desk&min=10&sort=price_asc");
  });
  it("clears a filter with null and preserves repeated conditions", () => {
    assert.equal(exploreHref({ q: "a", cond: ["new", "good"] }, { q: null }), "/explore?cond=new&cond=good");
    assert.equal(exploreHref({}), "/explore");
  });
});
