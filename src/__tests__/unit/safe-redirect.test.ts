import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "@/lib/safe-redirect";

describe("safeNext", () => {
  it("keeps same-origin paths", () => { assert.equal(safeNext("/explore?q=desk"), "/explore?q=desk"); assert.equal(safeNext("/messages/abc"), "/messages/abc"); });
  it("rejects external and protocol-relative targets", () => {
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "\\\\evil.test", "javascript:alert(1)", "evil.test", ""]) assert.equal(safeNext(bad), "/", bad);
  });
  it("rejects control characters and non-strings", () => {
    assert.equal(safeNext("/a\r\nSet-Cookie: x=1"), "/"); assert.equal(safeNext(undefined), "/"); assert.equal(safeNext(null), "/"); assert.equal(safeNext(42), "/");
  });
  it("honours a custom fallback and a length cap", () => { assert.equal(safeNext("x", "/you"), "/you"); assert.equal(safeNext("/" + "a".repeat(600)), "/"); });
});
