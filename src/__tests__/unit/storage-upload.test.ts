import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildUploadRequest, percent } from "@/lib/storage-upload";

const base = { supabaseUrl: "https://abc.supabase.co/", anonKey: "anon", accessToken: "tok", bucket: "listing-images" };
describe("buildUploadRequest", () => {
  it("targets the Storage object endpoint without a double slash", () => {
    assert.equal(buildUploadRequest({ ...base, path: "u1/l1/a.webp" }).url, "https://abc.supabase.co/storage/v1/object/listing-images/u1/l1/a.webp");
  });
  it("authenticates as the signed-in user, never with a service key", () => {
    const r = buildUploadRequest({ ...base, path: "a/b.webp" });
    assert.equal(r.headers.Authorization, "Bearer tok"); assert.equal(r.headers.apikey, "anon");
  });
  it("only overwrites when asked", () => {
    assert.equal(buildUploadRequest({ ...base, path: "a" }).headers["x-upsert"], "false");
    assert.equal(buildUploadRequest({ ...base, path: "a", upsert: true }).headers["x-upsert"], "true");
  });
  it("percent-encodes each path segment but keeps the folder separators", () => {
    assert.match(buildUploadRequest({ ...base, path: "u 1/l#1/a b.webp" }).url, /u%201\/l%231\/a%20b\.webp$/);
  });
});
describe("percent", () => {
  it("rounds and clamps", () => { assert.equal(percent(50, 200), 25); assert.equal(percent(300, 200), 100); assert.equal(percent(1, 3), 33); });
  it("never returns NaN for unknown or invalid totals", () => { for (const [l, t] of [[5, 0], [-1, 10], [5, -2]] as const) assert.equal(percent(l, t), 0); });
});
