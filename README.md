# f!nd

University marketplace and campus community PWA. Next.js (App Router) + Supabase.

## Status (Phase 1, in progress)
Done: strict TypeScript config, design tokens, fonts (Inter + Newsreader via next/font), PWA manifest, security headers, migration 0001 (universities, profiles, memberships, categories, listings, listing_images, RLS, status-transition trigger).
Slice 5 added: exchange records (seller records, buyer confirms, needs a real enquiry), transaction-linked reviews (one per reviewer per exchange, via SECURITY DEFINER functions only), reputation shown only when reviews exist, public profile page, review disputes, moderator console (membership approvals, report actions, audit log), message-report excerpts so moderators never browse private chats (migration 0006). Known limit: two colluding accounts can still fake an exchange; the enquiry, confirmation and one-exchange-per-listing rules make it costly, not impossible.
Slice 4 added: Requests board (expiry enforced by RLS, respond via messaging) and Lost and found (campus area only, ID-number guard, private photos, resolve flow, reuse of messaging) with migration 0005. Not yet: exchange records and reviews, moderator UI, community feed.
Slice 3 added: two-party conversations tied to listings (start_conversation), realtime messages with durable storage, idempotent retry (client_id), reconnect catch-up, unread counts, image sharing (private bucket), block/unblock, reporting (derives university server-side), message rate limit (migration 0004). Not yet: read receipts, moderator UI to action reports, push notifications.
Slice 2 added: listings (create, draft, edit, publish, sold/archive), private image storage with client-side compression and retry, keyset-paginated search with typo tolerance, listing detail, saved items, seller dashboard (migration 0003). Not yet: photo reordering, price sorting, messaging (so no Contact button yet), reporting.
Slice 1 added: email sign-in/sign-up, onboarding (university request), moderator review function (migration 0002), app shell with responsive nav. Not done: moderator review UI, rate limiting, service worker, image upload, RLS test suite, icons (see below).
Nothing here has been built, run or tested yet.

## Setup
1. `npm install`
2. Create a Supabase project, copy `.env.example` to `.env.local`, fill in values.
3. Apply `supabase/migrations/*.sql` (Supabase CLI: `supabase db push`).
4. `npm run dev`

## Known gaps to close before launch
- Add PNG icons to `public/icons/` (192, 512, maskable-512).
- Add a service worker (Serwist). It must never cache authenticated responses.
- Membership verification is a moderator/server action by design; users can only request it.
- Add a pgTAP suite proving cross-university isolation before any real data goes in.
