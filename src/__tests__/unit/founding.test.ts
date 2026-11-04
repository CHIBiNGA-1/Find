import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { daysLeft, parseFoundingError, progressPercent } from "@/lib/founding";

describe("founding helpers", () => {
  it("counts whole days left and never goes negative", () => {
    const now = Date.parse("2026-11-01T00:00:00Z");
    assert.equal(daysLeft("2026-12-01T00:00:00Z", now), 30);
    assert.equal(daysLeft("2026-11-01T06:00:00Z", now), 1);
    assert.equal(daysLeft("2026-10-01T00:00:00Z", now), 0);
  });
  it("caps progress at 100 and survives a zero target", () => {
    assert.equal(progressPercent(5, 15), 33); assert.equal(progressPercent(40, 15), 100); assert.equal(progressPercent(1, 0), 100);
  });
  it("maps database errors to stable codes", () => {
    assert.deepEqual(parseFoundingError("similar_exists:Copperbelt University"), { code: "similar", name: "Copperbelt University" });
    assert.equal(parseFoundingError("already_founded").code, "already_founded");
    assert.equal(parseFoundingError("already_member").code, "already_member");
    assert.equal(parseFoundingError("invalid_name").code, "invalid_name");
    assert.equal(parseFoundingError("exists").code, "exists");
    assert.equal(parseFoundingError("boom").code, "failed");
  });
});
