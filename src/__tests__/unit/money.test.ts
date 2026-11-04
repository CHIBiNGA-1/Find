import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMinor, minorToInput, formatMoney } from "@/lib/money";

describe("parseMinor (real module)", () => {
  it("parses whole and decimal amounts exactly", () => {
    assert.equal(parseMinor("125"), 12500); assert.equal(parseMinor("125.5"), 12550);
    assert.equal(parseMinor("0.07"), 7); assert.equal(parseMinor("19.99"), 1999);
  });
  it("accepts a comma decimal separator", () => assert.equal(parseMinor("150,50"), 15050));
  it("trims whitespace", () => assert.equal(parseMinor("  10 "), 1000));
  it("rejects empty, negative, 3 decimals, text, and Infinity", () => {
    for (const bad of ["", "-1", "1.234", "abc", "Infinity", "1e5", "1,234.5", "1,2,3"]) assert.equal(parseMinor(bad), null, bad);
  });
  it("rejects more than 9 integer digits", () => assert.equal(parseMinor("1234567890"), null));
  it("is exact where floats are not (0.1 + 0.2 style inputs)", () => assert.equal(parseMinor("1.15"), 115));
});
describe("minorToInput", () => {
  it("round-trips with parseMinor", () => {
    for (const m of [0, 1, 7, 99, 100, 101, 1005, 12345, 99999999]) assert.equal(parseMinor(minorToInput(m)), m);
  });
  it("omits cents when zero", () => assert.equal(minorToInput(12300), "123"));
});
describe("formatMoney", () => {
  it("formats with the given currency and drops zero cents", () => {
    assert.match(formatMoney(15000, "ZMW"), /150/); assert.doesNotMatch(formatMoney(15000, "ZMW"), /\.00/);
    assert.match(formatMoney(15050, "ZMW"), /150[.,]50/);
  });
});
