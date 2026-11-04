// Minimal Supabase stand-in for browser smoke tests. NOT a substitute for testing against a real project.
import http from "node:http";
const U = "00000000-0000-4000-8000-000000000001", S = "00000000-0000-4000-8000-000000000002", UNI = "00000000-0000-4000-8000-0000000000aa";
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
const cats = [["textbooks", "Textbooks"], ["electronics", "Electronics"], ["furniture", "Furniture"], ["clothing", "Clothing"], ["services", "Services"], ["other", "Other"]]
  .map(([slug, name], i) => ({ id: id(100 + i), slug, name, parent_id: null }));
cats.push({ id: id(200), slug: "textbooks-course", name: "Course textbooks", parent_id: id(100) }, { id: id(201), slug: "electronics-phones", name: "Phones and tablets", parent_id: id(101) });
const mk = (n, title, price, cond, cat, mins) => ({ id: id(n), university_id: UNI, seller_id: n % 3 ? S : U, category_id: cat, title, description: "Barely used. Pickup near the main library.\nHappy to meet in the afternoon.", price_minor: price, currency_code: "ZMW", condition: cond, status: "active", published_at: ago(mins), meeting_preferences: "Library entrance, weekdays after 4pm", campus_area: "Great East Road campus", profiles: { display_name: n % 3 ? "Chanda M." : "Mwansa" } });
const listings = [mk(1, "Engineering Mathematics (Stroud), 6th edition", 18000, "good", id(200), 20), mk(2, "Casio fx-991EX scientific calculator", 25000, "like_new", id(101), 90), mk(3, "Study desk with drawer", 45000, "fair", id(102), 300), mk(4, "Samsung Galaxy A14, 64GB", 120000, "good", id(201), 700), mk(5, "Lab coat, size M", 3500, "good", id(103), 1500), mk(6, "Mini fridge", 90000, "good", id(102), 3000), mk(7, "Organic Chemistry notes bundle", 2000, "new", id(100), 5000), mk(8, "Desk lamp", 1500, "good", id(101), 9000)];
const rows = {
  universities: [{ id: UNI, name: "University of Zambia", currency_code: "ZMW", timezone: "Africa/Lusaka" }],
  university_memberships: [{ id: id(900), university_id: UNI, user_id: U, role: "student", status: "verified", verified_at: ago(60 * 24 * 40), universities: { name: "University of Zambia", currency_code: "ZMW", timezone: "Africa/Lusaka" } }],
  categories: cats, listings,
  listing_images: [{ id: id(300), listing_id: id(1), storage_path: "a/b/c.webp", width: 800, height: 1000, position: 0, alt_text: null }],
  saved_listings: [{ listing_id: id(2), listings: { ...listings[1] } }],
  requests: [{ id: id(400), author_id: S, title: "Looking for a scientific calculator", description: "Casio or similar, for exams.", budget_minor: 20000, currency_code: "ZMW", expires_at: ago(-60 * 24 * 9), created_at: ago(120), status: "open", profiles: { display_name: "Chanda M." } }],
  lost_found_reports: [{ id: id(500), kind: "lost", title: "Blue water bottle", description: "Dented lid", area: "Library, level 2", occurred_on: "2026-11-02", status: "open", image_path: null, created_at: ago(200), reporter_id: S }, { id: id(501), kind: "found", title: "Black umbrella", description: "", area: "Main gate", occurred_on: "2026-11-03", status: "open", image_path: null, created_at: ago(60), reporter_id: S }],
  conversations: [{ id: id(600), buyer_id: U, seller_id: S, listing_id: id(1), request_id: null, lost_found_id: null, last_message_at: ago(5), listings: { title: listings[0].title, status: "active", price_minor: 18000, currency_code: "ZMW" }, requests: null, lost_found: null, buyer: { display_name: "Mwansa" }, seller: { display_name: "Chanda M." } },
    { id: id(601), buyer_id: S, seller_id: U, listing_id: id(3), request_id: null, lost_found_id: null, last_message_at: ago(600), listings: { title: listings[2].title, status: "active", price_minor: 45000, currency_code: "ZMW" }, requests: null, lost_found: null, buyer: { display_name: "Chanda M." }, seller: { display_name: "Mwansa" } }],
  messages: [{ id: id(700), client_id: id(700), conversation_id: id(600), sender_id: U, body: "Hi, is this still available?", image_path: null, created_at: ago(30) }, { id: id(701), client_id: id(701), conversation_id: id(600), sender_id: S, body: "Yes it is. I can meet tomorrow at the library.", image_path: null, created_at: ago(5) }],
  profiles: [{ id: U, display_name: "Mwansa", created_at: ago(60 * 24 * 60) }, { id: S, display_name: "Chanda M.", created_at: ago(60 * 24 * 90) }],
  exchange_records: [], reviews: [{ id: id(800), rating: 5, comment: "Smooth handover.", created_at: ago(60 * 24 * 3), status: "published", reviewer: { display_name: "Chanda M." } }], blocks: [], moderation_actions: [], reports: [],
};
const rpcs = { unread_counts: [{ conversation_id: id(600), unread: 1 }], search_listings: listings, trending_listings: [listings[1]], reputation: [{ review_count: 3, avg_rating: "4.7" }], conversation_previews: [{ conversation_id: id(600), body: "Yes it is. I can meet tomorrow at the library.", has_image: false, sender_id: S, created_at: ago(5) }, { conversation_id: id(601), body: "Can you do 400?", has_image: false, sender_id: S, created_at: ago(600) }], peer_last_read: null, pending_memberships: [], moderation_queue: [], open_reports: [] };
const svg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe0d4"/><stop offset="1" stop-color="#9db8a6"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
export function start(port = 54321) {
  const calls = [], rpcLog = [];
  let imgSeq = 0, newId = 0;
  const srv = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`); let body = ""; for await (const c of req) body += c;
    calls.push(`${req.method} ${url.pathname}`);
    const cors = { "access-control-allow-origin": req.headers.origin ?? "*", "access-control-allow-credentials": "true", "access-control-allow-headers": req.headers["access-control-request-headers"] ?? "*", "access-control-allow-methods": "*", "access-control-expose-headers": "content-range" };
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    const json = (code, data, extra = {}) => { res.writeHead(code, { "content-type": "application/json", ...cors, ...extra }); res.end(JSON.stringify(data)); };
    if (url.pathname === "/auth/v1/user") return json(200, { id: U, aud: "authenticated", role: "authenticated", email: "mwansa@unza.test", app_metadata: {}, user_metadata: { display_name: "Mwansa" }, created_at: ago(9999) });
    if (url.pathname.includes("/object/sign/img/") || (url.pathname.startsWith("/storage/v1/object/") && req.method === "GET" && !url.pathname.includes("/object/sign/"))) { res.writeHead(200, { "content-type": "image/svg+xml", ...cors }); return res.end(svg(800, 1000)); }
    if (url.pathname.startsWith("/storage/v1/object/sign/") && req.method === "POST") { const paths = JSON.parse(body || "{}").paths ?? []; return json(200, paths.map((p) => ({ path: p, signedURL: `/object/sign/img/${encodeURIComponent(p)}?token=t`, error: null }))); }
    if (url.pathname.startsWith("/storage/v1/object/sign/")) { res.writeHead(200, { "content-type": "application/json", ...cors }); return res.end(JSON.stringify({ signedURL: `/object/sign/img/x?token=t` })); }
    if (url.pathname.startsWith("/storage/v1/object/sign/img") || url.pathname.startsWith("/storage/v1/object/")) { res.writeHead(200, { "content-type": "image/svg+xml", ...cors }); return res.end(svg(800, 1000)); }
    if (url.pathname.startsWith("/storage/v1/object/") && req.method === "POST") { await new Promise((r) => setTimeout(r, 1200)); return json(200, { Key: url.pathname.replace("/storage/v1/object/", ""), Id: "obj" }); }
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      const n = url.pathname.split("/").pop(); let args = {}; try { args = JSON.parse(body || "{}"); } catch {} rpcLog.push({ name: n, args });
      if (n === "register_listing_image") return json(200, id(1000 + ++imgSeq));
      if (n === "reorder_listing_images") return json(200, null);
      return n in rpcs ? json(200, rpcs[n]) : json(200, []);
    }
    if (url.pathname.startsWith("/rest/v1/")) {
      const t = url.pathname.split("/").pop(); let data = rows[t] ?? [];
      for (const [k, v] of url.searchParams) { if (v.startsWith("eq.") && data.some((r) => k in r)) data = data.filter((r) => String(r[k]) === v.slice(3)); }
      const one = (req.headers.accept ?? "").includes("pgrst.object");
      if (req.method === "HEAD") return json(200, "", { "content-range": `0-0/${data.length}` });
      if (req.method !== "GET") { const row = { id: id(2000 + ++newId) }; return (req.headers.accept ?? "").includes("pgrst.object") ? json(req.method === "POST" ? 201 : 200, row) : json(req.method === "POST" ? 201 : 200, [row]); }
      if (one) return data.length ? json(200, data[0]) : json(406, { code: "PGRST116", message: "no rows", details: "", hint: "" });
      return json(200, data, { "content-range": `0-${Math.max(0, data.length - 1)}/${data.length}` });
    }
    json(404, { message: "mock: not found " + url.pathname });
  });
  return new Promise((r) => srv.listen(port, () => r({ srv, calls, rpcLog })));
}
if (process.argv[1].endsWith("mock-supabase.mjs")) { await start(); console.log("mock supabase on 54321"); }
