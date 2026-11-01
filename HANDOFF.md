# CampusHive — Session Handoff Notes
*Prepared: November 2026 · Production Hardening Sprint*

---

## What Was Done This Session

### 0. Build Baseline (Node & TypeScript)

The project couldn't build at all when we started. Here's what was fixed:

- **Node version**: Upgraded from 18.19.1 → 20.20.2. The `@tailwindcss/oxide` Rust binary requires Node ≥ 20. A `.nvmrc` file now pins this.
- **TypeScript strict errors** (all implicit `any`): Fixed across 9 files:
  - `src/app/(app)/admin/page.tsx` — `pending_memberships` RPC row type
  - `src/app/(app)/explore/page.tsx` — `search_listings` RPC result
  - `src/app/(app)/layout.tsx` — `unread_counts` RPC result
  - `src/app/(app)/messages/layout.tsx` — `unread_counts` RPC result
  - `src/app/(app)/profile/[id]/page.tsx` — `reputation` RPC result
  - `src/app/(app)/listing/[id]/page.tsx` — `reputation` RPC result + `img src` null type
  - `src/app/(app)/page.tsx` — `search_listings` RPC result
  - `src/app/(app)/lost-found/page.tsx` — `img src` null type
  - `src/lib/supabase/server.ts` — `setAll` cookie parameter type
  - `src/middleware.ts` — `setAll` cookie parameter type
- **`src/lib/env.ts`**: Converted from eager Zod parse (throws at import time) to a lazy Proxy. This allows Next.js to collect route metadata at build time without requiring env vars to be present.
- **`next.config.ts`**: Added `outputFileTracingRoot: path.join(__dirname)` to silence the workspace-root lockfile warning.
- **`export const dynamic = "force-dynamic"`**: Added to `(app)/layout.tsx` (propagates to all 15 child routes), `onboarding/page.tsx`, `sign-in/page.tsx`, `sign-up/page.tsx`.

**Final result**: `npm run build` — ✓ Compiled · ✓ Linting and checking validity of types · ✓ 26 routes

---

### 1. Test Suite

#### Database Tests (pgTAP) — `supabase/tests/`

Run with `supabase test db` against a local Supabase instance.

**`01_university_isolation.sql`** — 22 assertions covering:
- `is_verified_member()` correctness across universities
- RLS blocks reads of listings, requests, lost-found reports, profiles across universities
- RLS blocks cross-university INSERT on listings
- Users cannot self-elevate membership role or self-verify (RLS)
- Trigger: `sold → active` listing transition raises `invalid_status_transition`
- Trigger: `seller_id` and `university_id` on listings are immutable (`listing_scope_immutable`)
- Trigger: Request `university_id` is immutable; non-open requests cannot change status
- `start_conversation()` raises `42501 not_authorized` for cross-university callers

**`02_conversation_privacy.sql`** — 18 assertions covering:
- `is_participant()` returns correct true/false for all actor/conversation combos
- RLS: participants can read their own conversations and messages
- RLS: non-participants and uninvolved university members see nothing
- RLS: non-participants cannot INSERT messages
- `is_blocked_between()` is symmetric; blocked senders cannot INSERT messages
- `mark_read()` raises `not_authorized` for non-participants
- `conversation_reads` table hidden from non-owners

#### Unit Tests — `src/__tests__/unit/`

**Test runner**: `tsx --test` (Node.js built-in `node:test`). Chosen because the Vitest/Rollup 4 toolchain requires AVX2 CPU instructions which are unavailable on this machine. The `npm test` script works anywhere Node 20 is available.

**54/54 tests pass** across 3 files:

- `money.test.ts` — `parseMinor` (10 tests) and `formatMoney` (4 tests)
- `listings-schema.test.ts` — valid/invalid listing input validation (14 tests)
- `campus-schema.test.ts` — requests, lost-and-found, status transition rules (26 tests)

**Bug found and fixed**: `parseMinor("")` was returning `0` instead of `null` because `Number("") === 0` in JavaScript. The empty-string guard is now explicit in `src/lib/money.ts`.

---

### 2. Service Worker & PWA

- **`public/sw.js`**: Hand-rolled service worker (no Workbox dependency). Strategies:
  - `/_next/static/*` → cache-first (immutable content-hashed assets)
  - Navigation → network-first with offline fallback
  - All Supabase paths (`/rest/v1/`, `/auth/v1/`, `/storage/v1/`, `/realtime/`, `supabase.co`) → **network-only** (auth tokens/private data never cached)
  - Non-GET requests → never intercepted
  - Push notification event handlers wired up (skeleton for future use)
- **`public/offline.html`**: Branded fallback page matching CampusHive green theme
- **`src/components/sw-registration.tsx`**: Client component (`useEffect`) that registers `sw.js` — mounted once in root layout

---

### 3. Account Deletion

- **`supabase/migrations/0007_account_deletion.sql`**: `delete_own_account()` security-definer function:
  1. Anonymises the profile (`display_name = 'Deleted User'`, `avatar_path = null`) so stale references in reviews/moderation logs degrade gracefully
  2. Suspends all memberships → content becomes invisible via RLS **before** the auth row is removed
  3. Deletes the `auth.users` row → FK cascade removes the profile and all child rows

- **`src/app/(app)/you/settings-actions.ts`**: Two server actions:
  - `updateProfile(state, formData)` — validates display name, updates profiles table
  - `deleteAccount(confirmation)` — validates "DELETE" string, calls RPC, signs out, redirects

---

### 4. Settings Screens

Three new routes added to the `/you` section:

- **`/you`** — Added Settings + Sign Out as a flex row (previously only Sign Out)
- **`/you/settings`** — Profile edit (display name), notifications stub, danger zone link
- **`/you/settings/danger`** — Two-step account deletion: first click reveals the input, button only enables after typing "DELETE" exactly

The profile form uses `useActionState` for progressive enhancement and shows field-level Zod validation errors inline.

---

### 5. Feed Improvements

**Home page (`/`)**:
- Hero section with tagline and inline search form (submits GET to `/explore?q=...`)
- Primary "Sell something" CTA button
- Campus quick-links bar: Requests · Lost & found · Messages
- **Category pill nav**: live from the `categories` table, with emoji fallback icons, links to `/explore?cat=<uuid>`
- Recent listings grid (16 items, responsive 2→3→4 columns) with "See all →" link
- Rich empty state with "Post a listing" CTA instead of a bare text message

**Explore page (`/explore`)**:
- Page `<h1>` title changes to the selected category name when filtering
- Inline "✕ Clear filters" link appears whenever any filter is active
- Results count line: "Showing 24+ listings matching your filters"
- Compact 5-column filter bar + condition checkboxes with `accent-brand` styling
- Proper empty state card with "Clear all filters" button
- Centered "Load more" keyset-pagination link (replaces bare link at page bottom)

---

### 6. Deployment & Operations Docs

Three markdown files added under `docs/`:

- **`deployment.md`**: Prerequisites table, Supabase project setup, migrations, env vars, Vercel deployment steps, custom domain/SSL, Node version, running tests, post-deploy checklist
- **`operations.md`**: Adding universities (SQL), promoting moderators, message rate-limit configuration (`ALTER DATABASE`), manual user suspension/reinstatement, content removal, GDPR deletion procedure, monitoring queries, migration rollback strategy, Realtime troubleshooting
- **`runbook.md`**: Complete error code reference table for all P0001 DB errors, seven incident playbooks (auth, blank pages, realtime, broken images, build failures, spam, GDPR), escalation matrix

---

## Advice & Recommendations

These are observations from reading the full codebase closely. None are blockers, but several could bite you in production.

---

### 🔴 High Priority

**1. No Supabase-generated TypeScript types**

Every RPC call (`search_listings`, `unread_counts`, `reputation`, `pending_memberships`, etc.) required manual type casts (`as ListingRow[]`) because there are no generated types. If the database schema changes — even a renamed column — the app silently breaks with no TypeScript error.

**Recommendation**: Run `supabase gen types typescript --local > src/lib/database.types.ts` and pass the generated type to `createClient<Database>()`. This converts every `.from()` and `.rpc()` call into a typed query that fails at compile time if the schema diverges.

---

**2. `parseMinor` was not the only place — check `explore/page.tsx` min/max parsing**

The explore page passes `sp.min` and `sp.max` (URL query params) directly to `parseMinor`. If a user crafts a URL with `?min=0&max=0`, they get `parseMinor("0") === 0` which is correct. But if the user passes `?min=&max=`, `parseMinor("") === null` which is also now correct after the fix. However, the explore page doesn't validate that `min ≤ max` before querying — a user passing `?min=500&max=100` will return zero results silently. Consider adding a server-side check or just clamping.

---

**3. The `search_listings` RPC returns `setof public.listings` which includes `seller_id`, `description`, and all columns — more data than the client needs**

The home page and explore page only use `id, title, price_minor, currency_code, condition, published_at`. Returning full listing rows (including `description` which can be 4000 chars) adds unnecessary payload.

**Recommendation**: Create a slimmer `search_listings_summary` RPC that returns only the columns the UI needs, or add a `SECURITY INVOKER` view for the feed.

---

### 🟡 Medium Priority

**4. No CSRF protection on Server Actions**

Next.js 15 Server Actions have CSRF protection built in for same-origin form submissions. However, if you ever expose actions via direct `fetch()` calls (e.g. for a mobile app), ensure the `Origin` header is checked. The current setup is fine for the web app.

**5. Rate limiting is per-user at the DB level — but there's no application-level rate limiting**

The `enforce_message_rate_limit()` trigger limits messages per user per minute at the DB level (good). But there's nothing stopping someone from hammering the sign-up endpoint with thousands of requests. Vercel's built-in rate limiting or a middleware like `@upstash/ratelimit` would protect auth routes.

**6. Email confirmation is the only verification path for some universities**

The `verification_strategy` column supports `'email_domain'`, `'manual_review'`, and `'institutional_sso'`. Only `manual_review` is implemented in the UI (the admin panel approves pending memberships). Email domain verification is defined in the schema but the trigger/function to auto-approve based on `email_domains[]` is missing from the migrations. If you add a university with `verification_strategy = 'email_domain'`, memberships will stay `pending` forever.

**Recommendation**: Either add the auto-approve trigger, or prevent setting `verification_strategy = 'email_domain'` until it's implemented.

**7. `listing_images` storage path is user-UUID prefixed, but the path structure isn't enforced for sub-folders**

The storage policy allows upload to any path starting with the user's UUID. A user could upload to `<uuid>/anything/deeply/nested/file.jpg`. This isn't a security issue but could make storage management harder.

---

### 🟢 Low Priority / Nice-to-Have

**8. The offline page is served from cache but the app shell isn't pre-cached**

The SW caches `/_next/static/` assets on demand (cache-first) but doesn't pre-cache the app shell on install. If a user visits only one page before going offline, only that page's assets are cached. Consider a manifest-based pre-cache of key JS chunks using `/__nextjs_static_manifest` or a build-time generated list.

**9. `vitest.config.ts` is still in the repo but the test runner is now `tsx --test`**

The `vitest.config.ts` file exists and vitest is in devDependencies, but `npm test` now uses `tsx --test`. This is fine for CI environments that do have AVX2 (they can run `npx vitest run` directly), but it's potentially confusing. Consider adding a comment to `vitest.config.ts` explaining why two test setups exist.

**10. No `robots.txt` or `sitemap.xml`**

The app is university-only (all pages are behind auth), so search indexing doesn't make sense. But adding `public/robots.txt` with `Disallow: /` prevents any accidental crawling of staging environments.

**11. The `manifest.webmanifest` icon sizes**

The web app manifest exists but the `icons/` directory may be empty or contain placeholder icons. For reliable PWA install prompts in Chrome, you need:
- `icon-192.png` (192×192, any purpose)
- `icon-512.png` (512×512, any purpose)
- `icon-512-maskable.png` (512×512, maskable — safe zone matters)

Without these, the "Add to home screen" prompt is inconsistent across browsers.

---

## Quick Command Reference

```bash
# Development
nvm use                    # switch to Node 20 (reads .nvmrc)
npm run dev                # start dev server

# Build & test
npm run build              # production build (must pass before deploy)
npm test                   # 54 unit tests via tsx --test
npm run typecheck          # tsc --noEmit

# Database
supabase start             # start local Supabase
supabase db reset          # apply all migrations + seed.sql
supabase test db           # run pgTAP tests in supabase/tests/
supabase gen types typescript --local > src/lib/database.types.ts

# Deploy
vercel --prod              # manual production deploy
supabase db push           # apply pending migrations to linked project
```

---

## Review pass (follow-up session)

Verified here: `tsc --noEmit` clean, 54/54 unit tests pass, `next build` succeeds. **Not verified:** the pgTAP suite and all migrations (no Postgres/Supabase available), and any runtime behaviour.

Fixed:
- **Service worker offline page was broken for signed-in users.** `/offline.html` counted as a public path, so the middleware redirected signed-in users to `/`; the worker would have cached a copy of the home page as its "offline" page. `offline.html` is now excluded from the middleware matcher.
- **Moderators could not delete their account.** `moderation_actions.actor_id` was the only foreign key to `profiles` without a cascade, so `delete_own_account()` failed with a foreign-key error. Migration `0008` makes it `ON DELETE SET NULL` (audit rows are kept, actor becomes unknown).
- **Account deletion left photos behind.** Deleting `auth.users` does not remove storage objects. `deleteAccount` now removes the user's listing, lost-and-found and chat images first (best effort). `0008` adds the missing storage delete policies.
- **Fonts** now come from npm (`@fontsource*`) instead of build-time Google Fonts, so builds don't need internet access to Google.

Open decisions (not changed):
- Deleting an account cascades to exchange records and reviews, so the other party loses reviews written about them and chat history. Consider anonymising instead of deleting for these tables.
- Deletion removes files before the database call; if the call fails, the account remains but its photos are gone.
