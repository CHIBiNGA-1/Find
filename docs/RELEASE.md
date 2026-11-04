# Release guide: redesign release candidate

## What ships
- Application redesign (no new framework, no second backend).
- **Two migrations: `0011_discovery_and_messaging_refinements.sql` and `0012_push_subscriptions.sql`.** `0012` adds one table and one function and touches nothing existing. `0011` is additive and backward compatible. Nothing is dropped except the old 9-argument `search_listings` signature, which is replaced by a 12-argument function whose three new arguments all have defaults, so the previous app build keeps working during rollout.

## Environment variables
The two existing variables are unchanged (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Push notifications add five **optional** ones (see `.env.example`); with none of them set the app behaves as before and the Settings toggle stays hidden.

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | public | Shows the toggle; identifies your server to browsers |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | server only | Signs push requests (`npx web-push generate-vapid-keys`; subject like `mailto:you@domain`) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Privileged key used only by `/api/push/notify` to read recipient subscriptions; never expose it to the client |
| `PUSH_WEBHOOK_SECRET` | server only | Shared secret sent by the Supabase webhook as the `Authorization` header |

The service-role key bypasses RLS. Keep it only in Vercel's server environment, never in a `NEXT_PUBLIC_` variable.

## Deploy order (existing Vercel + Supabase; Render if you use it for anything)
This repository contains no Render configuration, so Render could not be reviewed. Treat anything running there as unverified.
1. **Back up** the production database (Supabase dashboard, Database, Backups; take a manual backup or PITR marker).
2. **Rehearse** `0011` and `0012` on a Supabase branch or staging project restored from that backup. Run `supabase/tests/03_discovery_and_exchange.sql` and `04_push_subscriptions.sql` there.
3. Apply both to production (`supabase db push`). The old app build continues to work.
4. Deploy the new app build to Vercel (preview first, then promote). Push stays off until step 6.
5. Smoke test with a real account: search (relevance is the default with a search term), create a listing with 3 photos and drag them into a new order, open a conversation and send a message from a second account, check "Seen".
6. **Enable push (optional).** Set the five variables above in Vercel and redeploy. In Supabase, Database, Webhooks, create a webhook on table `messages`, event **Insert**, type HTTP Request, `POST https://<your-domain>/api/push/notify`, with header `Authorization` set to the same value as `PUSH_WEBHOOK_SECRET`. Then, on a phone with f!nd installed, turn notifications on under You, Settings, and message that account from another one. A wrong secret returns 401 and an unconfigured server returns 503, so a misconfiguration is visible in the webhook's delivery log.

## Rollback
- **App:** promote the previous Vercel deployment. The previous build works against the migrated database.
- **Push:** remove the webhook in Supabase (messages stop triggering sends immediately) and unset `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to hide the toggle. Nothing else changes.
- **Database (only if required):** `0011` and `0012` are safe to leave in place. To remove `0012`: `drop function public.register_push_subscription(text, text, text, text); drop table public.push_subscriptions;` (subscriptions are disposable). To remove `0011`: In a transaction:
  1. Drop `register_listing_image`, `reorder_listing_images`, `peer_last_read`, `conversation_previews`, and the 12-argument `search_listings`.
  2. Recreate the original `search_listings` from `0003_marketplace.sql`, `enforce_listing_rules` from `0001_foundation.sql`, and `confirm_exchange` from `0006_exchanges_reviews_moderation.sql`.
  3. Only if you accept losing the data: `alter table listings drop column campus_area`.
  4. Subcategory rows can stay. Delete them only if no listing references them.

## Known limitations
- **No verification against a real Supabase project.** pgTAP ran on PostgreSQL 16 with a stand-in for `auth` and `storage`; browser tests ran against a mock. Auth email delivery, storage policies on real buckets, and realtime delivery are unverified.
- **Account deletion removes exchanges and their reviews**, including a review the deleting user wrote about someone else. The deletion screen now says so. Preserving those reviews needs a foreign-key change and a product decision.
- **"Seen" reveals when you last read a conversation** to the other participant. It is disclosed in Settings. There is no opt-out yet.
- **Push delivery is not verified end to end.** The notifier logic, webhook authentication and validation, subscription storage and RLS, service worker handlers, and the Settings toggle are all tested. What no test here can do is deliver through a real browser push service to a real device. Verify with step 6 above before announcing it. On iPhone, notifications only work after f!nd is added to the Home Screen (the toggle says so). Notifications never contain message text; a message from someone you have blocked, or who has blocked you, sends nothing.
- **Touch drag-and-drop uses pointer events and was tested with a mouse and the keyboard** (arrow keys on the handle), not on a physical touchscreen. The handle sets `touch-action: none` so it should not fight page scrolling; confirm on a real phone.
- **Upload progress is real byte progress** from a custom `XMLHttpRequest` that mirrors the Storage REST protocol of the installed `@supabase/storage-js`. If a future major version of that library changes the protocol, `src/lib/storage-upload.ts` must follow it.
- **Relevance sorting pages by offset** (a computed score has no stable cursor), so a listing published mid-scroll can shift a result by one position. Newest and price sorts use keyset cursors and are stable.
- **Dependency advisories (`npm audit --omit=dev`: 1 moderate, 2 high):** all three are fixed only by a major upgrade (Next 16, Zod 4). PostCSS, which Next bundles, only processes this repo's own stylesheet at build time. The only client-supplied array that reaches Zod is length-checked first. Plan the Next 16 upgrade separately.
- The build prints a known warning about the Supabase client in Edge middleware. It is harmless.
- The welcome, sign-in, sign-up, onboarding, mark-as-sold and review screens received class fixes only, not a full redesign, and were not covered by the browser suite after the stylesheet change except sign-in and welcome.
