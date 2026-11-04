// Browser smoke test against a MOCK Supabase. Verifies rendering, layout, console cleanliness and accessibility. Not a data-integrity test.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import chromium from "@sparticuz/chromium";
import { start } from "./mock-supabase.mjs";
const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const axeSrc = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const PORT = 3100, BASE = `http://localhost:${PORT}`, OUT = process.env.SHOTS ?? "/tmp/shots";
fs.mkdirSync(OUT, { recursive: true });
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const { srv, rpcLog } = await start();
const app = spawn(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", String(PORT)], { cwd: ROOT, env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-for-local-mock-tests-only", NEXT_PUBLIC_VAPID_PUBLIC_KEY: "BMPWJynqhlN_7a19dTAmSDePnQa_3UjBR98dD-xL-QFYd7Xv8fzhPN_YvAo35RsBDsZU20WXuZJOMPSf_IBOpfs", VAPID_PRIVATE_KEY: "z1dZ8B1kCagB3g5aF66c8nJmNYy2K1CY86kB14TWP_U", VAPID_SUBJECT: "mailto:test@example.com", SUPABASE_SERVICE_ROLE_KEY: "service-role-key-for-mock-tests-only", PUSH_WEBHOOK_SECRET: "test-webhook-secret" }, stdio: "ignore" });
process.once("exit", () => { if (!app.killed) app.kill("SIGTERM"); srv.close(); });
let ready = false;
for (let i = 0; i < 60; i++) {
  try {
    const response = await fetch(BASE + "/welcome");
    if (response.ok) { ready = true; break; }
  } catch { /* The server is still starting. */ }
  await new Promise((r) => setTimeout(r, 500));
}
if (!ready) throw new Error("Next.js server did not become ready at /welcome");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "00000000-0000-4000-8000-000000000001", role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 86400 })}.sig`;
const session = { access_token: jwt, token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "r", user: { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", email: "mwansa@unza.test" } };
const cookie = { name: "sb-localhost-auth-token", value: "base64-" + b64(session), domain: "localhost", path: "/" };

const PAGES = [
  ["welcome", "/welcome", false], ["sign-in", "/sign-in", false],
  ["home", "/", true], ["explore", "/explore", true], ["explore-filtered", `/explore?q=desk&sort=price_asc&cond=good&min=100`, true], ["explore-category", `/explore?cat=${id(100)}`, true],
  ["sell", "/sell", true], ["listing", `/listing/${id(1)}`, true], ["listing-mine", `/listing/${id(3)}`, true],
  ["messages", "/messages", true], ["thread", `/messages/${id(600)}`, true],
  ["you", "/you", true], ["you-saved", "/you?tab=saved", true], ["you-reviews", "/you?tab=reviews", true], ["settings", "/you/settings", true],
  ["requests", "/requests", true], ["request", `/requests/${id(400)}`, true], ["lost-found", "/lost-found", true], ["lost-item", `/lost-found/${id(500)}`, true],
  ["profile", "/profile/00000000-0000-4000-8000-000000000002", true],
];
const VIEWPORTS = { mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, desktop: { width: 1280, height: 800 } };
const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: "shell" });
const results = [];
for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  for (const [name, path, authed] of (process.env.SKIP_PAGES ? [] : PAGES)) {
    const page = await browser.newPage(); await page.setViewport(vp);
    await page.deleteCookie({ name: cookie.name, domain: cookie.domain, path: "/" });
    if (authed) await page.setCookie(cookie);
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|WebSocket connection to .*54321\/realtime/.test(m.text())) errors.push("console: " + m.text().slice(0, 160)); });
    let status = 0;
    try { const r = await page.goto(BASE + path, { waitUntil: "networkidle0", timeout: 30000 }); status = r.status(); } catch (e) { errors.push("nav: " + e.message); }
    const notFound = await page.evaluate(() => /This page could not be found|Application error|Internal Server Error/.test(document.body.innerText));
    if (notFound) errors.push("rendered a not-found or error page");
    const finalPath = new URL(page.url()).pathname + new URL(page.url()).search;
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.evaluate(axeSrc);
    const axe = await page.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } }); window.__axePasses = r.passes.length; return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target?.join(" ").slice(0, 90) })); });
    await page.screenshot({ path: `${OUT}/${vpName}-${name}.png`, fullPage: false });
    const passes = await page.evaluate(() => window.__axePasses);
    results.push({ vp: vpName, name, status, finalPath: finalPath === path ? "" : finalPath, overflow, errors, axe, passes });
    await page.deleteCookie({ name: cookie.name, domain: cookie.domain, path: "/" }); await page.close();
  }
}

// ── Interaction tests ─────────────────────────────────────────────────────────────
const checks = [];
const check = (name, ok, detail = "") => { checks.push({ name, ok: !!ok, detail }); };
async function fresh(vp, path) { const pg = await browser.newPage(); await pg.setViewport(vp); await pg.setCookie(cookie); await pg.goto(BASE + path, { waitUntil: "networkidle0" }); return pg; }
{ // navigation: five destinations, correct chrome per breakpoint
  let pg = await fresh(VIEWPORTS.mobile, "/");
  const tabs = await pg.$$eval('nav[aria-label="Primary"].tabbar a, .tabbar a', (a) => a.map((x) => x.textContent.trim()));
  check("mobile: bottom bar has the five destinations", ["Home", "Explore", "Sell", "Messages", "You"].every((t) => tabs.some((x) => x.includes(t))), tabs.join("|"));
  check("mobile: sidebar hidden", await pg.$eval(".rail", (e) => getComputedStyle(e).display === "none"));
  check("home: greeting uses the profile's first name", await pg.$eval("main h1", (e) => /^Good (morning|afternoon|evening), Mwansa\.$/.test(e.textContent.trim())));
  check("home: Stationery category is available", await pg.$eval('nav[aria-label="Categories"]', (e) => e.textContent.includes("Stationery")));
  await pg.close();
  pg = await fresh(VIEWPORTS.desktop, "/");
  check("desktop: sidebar visible, bottom bar hidden", await pg.evaluate(() => getComputedStyle(document.querySelector(".rail")).display !== "none" && getComputedStyle(document.querySelector(".tabbar")).display === "none"));
  check("desktop: Home marked current", await pg.$eval('.rail a[aria-current="page"]', (e) => e.textContent.includes("Home")));
  await pg.close();
}
{ // explore: filter sheet round-trip preserves state in the URL
  const pg = await fresh(VIEWPORTS.mobile, "/explore?q=desk");
  await pg.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Filter and sort")).click());
  check("explore: filter sheet opens as a modal dialog", await pg.$eval("dialog.sheet", (d) => d.open));
  await pg.evaluate(() => { document.querySelector('input[name="sort"][value="price_asc"]').click(); document.querySelector('input[name="cond"][value="good"]').click(); });
  await pg.type('input[name="min"]', "100");
  await Promise.all([pg.waitForNavigation({ waitUntil: "networkidle0" }), pg.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Show results").click())]);
  const u = new URL(pg.url());
  check("explore: submitting filters updates the URL and keeps the search text", u.searchParams.get("q") === "desk" && u.searchParams.get("sort") === "price_asc" && u.searchParams.get("min") === "100" && u.searchParams.get("cond") === "good", u.search);
  await pg.close();
}
{ // explore: hostile URL values are dropped, not echoed or crashed on
  const pg = await fresh(VIEWPORTS.desktop, "/explore?min=abc&cat=%27%3Bdrop&sort=zzz&after=nope&at=bad");
  check("explore: malformed URL parameters render a normal page", await pg.evaluate(() => !/not found|error/i.test(document.body.innerText) && document.querySelector("h1")?.textContent === "Explore"));
  await pg.close();
}
{ // sell: subcategory appears only for categories that have one; validation reaches the user
  const pg = await fresh(VIEWPORTS.desktop, "/sell");
  check("sell: no subcategory field before choosing a category", (await pg.$$('select')).length === 1);
  await pg.select("select", "10000000-0000-4000-8000-000000000100");
  check("sell: subcategory field appears for Textbooks", await pg.evaluate(() => [...document.querySelectorAll("label")].some((l) => l.textContent.includes("Subcategory"))));
  await pg.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Publish").click());
  await pg.waitForFunction(() => document.body.innerText.includes("Check the highlighted fields") || document.querySelector('[role="alert"]'), { timeout: 8000 }).catch(() => {});
  check("sell: publishing an empty form shows an error instead of silently succeeding", await pg.evaluate(() => !!document.querySelector('[role="alert"], .err:not(:empty)')));
  await pg.close();
}
{ // chat: Enter sends, Shift+Enter does not; the sent message appears in the thread
  const pg = await fresh(VIEWPORTS.mobile, `/messages/${id(600)}`);
  await pg.type('textarea[aria-label="Message"]', "Can we meet at 3pm?");
  check("chat: Send is enabled once there is text", await pg.$eval('form button.btn-primary', (b) => !b.disabled));
  await pg.keyboard.press("Enter"); await new Promise((r) => setTimeout(r, 1200));
  check("chat: pressing Enter sends and the message appears once", await pg.evaluate(() => (document.body.innerText.match(/Can we meet at 3pm\?/g) || []).length === 1));
  check("chat: the composer clears after sending", await pg.$eval('textarea[aria-label="Message"]', (t) => t.value === ""));
  await pg.close();
}

{ // sell: real upload progress, then drag-and-drop reorder persisted in the new order
  const zlib = await import("node:zlib"); const await_crypto = await import("node:crypto");
  const png = () => { const w = 900, h = 700, raw = Buffer.alloc((w * 3 + 1) * h); const noise = (await_crypto).randomBytes(raw.length); noise.copy(raw); for (let y = 0; y < h; y++) raw[y * (w * 3 + 1)] = 0;
    const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
    const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]); };
  const files = [1, 2, 3].map((n) => { const f = `/tmp/find-photo-${n}.png`; fs.writeFileSync(f, png()); return f; });
  const pg = await fresh(VIEWPORTS.desktop, "/sell");
  await pg.type('input[name="title"]', "Test desk"); await pg.type('input[name="price"]', "100");
  await pg.select("select", "10000000-0000-4000-8000-000000000100");
  await pg.evaluate(() => document.querySelector('input[name="condition"][value="good"]').click());
  rpcLog.length = 0;
  const cdp = await pg.createCDPSession(); await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 10, downloadThroughput: -1, uploadThroughput: 700 * 1024 });
  await (await pg.$('input[type="file"][multiple]')).uploadFile(...files);
  let sawProgress = false, sawNonZero = false; const values = new Set();
  for (let i = 0; i < 160; i++) {
    const st = await pg.evaluate(() => ({ bars: [...document.querySelectorAll("progress")].map((p) => p.value), ready: [...document.querySelectorAll('[role="status"]')].filter((e) => e.textContent === "Ready").length }));
    if (st.bars.length) sawProgress = true; if (st.bars.some((v) => v > 0)) sawNonZero = true; st.bars.forEach((v) => values.add(v));
    if (st.ready >= 3) break; await new Promise((r) => setTimeout(r, 150));
  }
  check("sell: each photo shows a progress bar while uploading", sawProgress);
  check("sell: the progress value comes from real upload bytes (rises above 0)", sawNonZero);
  check("sell: progress passes through intermediate values, not just 0 then 100", [...values].some((v) => v > 0 && v < 100), [...values].join(","));
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const ready = await pg.evaluate(() => [...document.querySelectorAll('[role="status"]')].filter((e) => e.textContent === "Ready").length);
  check("sell: all three photos reach Ready", ready === 3, String(ready));
  const registered = rpcLog.filter((r) => r.name === "register_listing_image").length;
  check("sell: each photo was registered with the server exactly once", registered === 3, String(registered));
  await new Promise((r) => setTimeout(r, 600));
  const srcs = () => pg.$$eval("[data-photo-key] img", (i) => i.map((x) => x.src));
  const before = await srcs();
  const grips = await pg.$$('[data-photo-key] button[aria-label^="Reorder photo"]');
  check("sell: every ready photo has a reorder handle", grips.length === 3, String(grips.length));
  if (grips.length < 3) { const dump = await pg.evaluate(() => document.querySelector("section[aria-label=Photos]")?.innerText.replace(/\s+/g, " ").slice(0, 300)); check("sell: reorder diagnostics", false, dump + " | alerts: " + (await pg.evaluate(() => [...document.querySelectorAll('[role=alert]')].map((e) => e.textContent).join(";")))); await pg.close(); } else {
  const gb = await grips[2].boundingBox(), t1 = await (await pg.$('[data-photo-key]')).boundingBox();
  rpcLog.length = 0;
  await pg.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await pg.mouse.down();
  for (let i = 1; i <= 12; i++) await pg.mouse.move(gb.x + (t1.x + t1.width / 2 - gb.x) * i / 12, gb.y + (t1.y + t1.height / 2 - gb.y) * i / 12);
  const midDragReorders = rpcLog.filter((r) => r.name === "reorder_listing_images").length;
  await pg.mouse.up(); await new Promise((r) => setTimeout(r, 900));
  const after = await srcs();
  check("sell: dragging the third photo onto the first makes it the cover", after[0] === before[2] && after.length === 3, `${before.map((x) => x.slice(-6))} -> ${after.map((x) => x.slice(-6))}`);
  check("sell: nothing is saved mid-drag", midDragReorders === 0, String(midDragReorders));
  const re = rpcLog.filter((r) => r.name === "reorder_listing_images");
  const want = [id(1003), id(1001), id(1002)];
  check("sell: the new order is persisted once, after the drop", re.length === 1 && JSON.stringify(re[0].args.p_ids) === JSON.stringify(want), JSON.stringify(re.map((r) => r.args.p_ids)));
  // keyboard: the handle also reorders with the arrow keys
  await pg.focus('[data-photo-key]:nth-child(1) button[aria-label^="Reorder photo"]'); const k0 = await srcs();
  await pg.keyboard.press("ArrowRight"); const k1 = await srcs();
  check("sell: arrow keys on the handle reorder photos", k1[1] === k0[0] && k1[0] === k0[1]);
  await pg.close(); }
}

{ // push: settings toggle renders only when configured; webhook is authenticated, validated and privacy-preserving
  const pg = await fresh(VIEWPORTS.desktop, "/you/settings");
  await pg.waitForFunction(() => document.querySelector('[data-testid="push-status"]') && !/Checking/.test(document.querySelector('[data-testid="push-status"]').textContent), { timeout: 8000 }).catch(() => {});
  const txt = await pg.evaluate(() => document.querySelector('[data-testid="push-status"]')?.textContent ?? null);
  check("push: Settings shows a Notifications section when push is configured", txt !== null, String(txt));
  const hasEnable = await pg.evaluate(() => [...document.querySelectorAll("button")].some((b) => /Turn on notifications/.test(b.textContent)));
  check("push: where the browser has blocked notifications, it says so and offers no dead enable button", /blocked/.test(txt ?? "") && !hasEnable, String(txt));
  await pg.close();
  const post = (headers, payload) => fetch(BASE + "/api/push/notify", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(payload) });
  const rec = { type: "INSERT", table: "messages", record: { id: id(700), conversation_id: id(600), sender_id: "00000000-0000-4000-8000-000000000001", image_path: null } };
  check("push webhook: no credentials is 401 (and is not redirected to sign-in)", (await post({}, rec)).status === 401);
  check("push webhook: wrong secret is 401", (await post({ authorization: "Bearer nope" }, rec)).status === 401);
  const auth = { authorization: "Bearer test-webhook-secret" };
  check("push webhook: malformed body is 400", (await post(auth, { hello: "world" })).status === 400);
  check("push webhook: other events are acknowledged and ignored", (await (await post(auth, { ...rec, type: "DELETE" })).json()).ignored === true);
  const ok = await post(auth, rec); const out = await ok.json();
  check("push webhook: a valid message with no subscribers sends nothing", ok.status === 200 && out.sent === 0 && out.skipped === "no_subscriptions", JSON.stringify(out));
  const stranger = await (await post(auth, { ...rec, record: { ...rec.record, sender_id: "00000000-0000-4000-8000-0000000000ff" } })).json();
  check("push webhook: a sender outside the conversation is ignored", stranger.skipped === "not_participant", JSON.stringify(stranger));
}
{ // account area: tabs are real navigation and mark the current one
  const pg = await fresh(VIEWPORTS.desktop, "/you?tab=reviews");
  check("you: reviews tab is current and shows the review text", await pg.evaluate(() => document.querySelector('nav[aria-label="Your activity"] a[aria-current="page"]')?.textContent === "Reviews" && document.body.innerText.includes("Smooth handover")));
  check("you: verification status comes from membership data", await pg.evaluate(() => /Verified member of University of Zambia/.test(document.body.innerText)));
  await pg.close();
}
console.log("\nINTERACTION CHECKS");
for (const c of checks) console.log(`${c.ok ? "ok  " : "FAIL"} ${c.name}${c.ok ? "" : "  [" + c.detail + "]"}`);
console.log(`${checks.filter((c) => c.ok).length}/${checks.length} interaction checks passed`);
fs.writeFileSync(`${OUT}/interactions.json`, JSON.stringify(checks, null, 1));

await browser.close();
app.kill("SIGTERM");
srv.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
let bad = 0;
for (const r of results) {
  const serious = r.axe.filter((v) => v.impact === "serious" || v.impact === "critical");
  const flag = r.status !== 200 || r.errors.length || r.overflow > 0 || serious.length || r.finalPath;
  if (flag) bad++;
  console.log(`${flag ? "FAIL" : "ok  "} ${r.vp.padEnd(7)} ${r.name.padEnd(17)} http=${r.status}${r.finalPath ? " redirected→" + r.finalPath : ""} overflow=${r.overflow} errors=${r.errors.length} axe(serious+)=${serious.length} axe(all)=${r.axe.length} rules-passed=${r.passes}`);
  r.errors.slice(0, 2).forEach((e) => console.log("      " + e)); serious.forEach((v) => console.log(`      axe ${v.impact} ${v.id} x${v.n} ${v.sample}`));
}
console.log(`\n${results.length - bad}/${results.length} page renders clean`);
