# f!nd — On-Call Runbook

This runbook helps on-call engineers diagnose and resolve common production incidents quickly.

---

## Error Code Reference

All application-level errors use PostgreSQL error code `P0001` with a message string. Here are the known codes and their resolutions:

| Error message | Trigger | Resolution |
|---|---|---|
| `listing_scope_immutable` | Attempt to change `seller_id` or `university_id` on a listing | Bug in client code — investigate how the update was called |
| `invalid_status_transition` | Illegal listing/request/lost-found status change | Check `enforce_listing_rules()` or `enforce_campus_rules()` for valid transitions |
| `listing_unavailable` | `start_conversation()` called on a non-active listing | Listing was sold/archived between page load and form submit — safe to retry |
| `own_listing` | User tried to message themselves | UI should prevent this; if seen in logs it's likely a data anomaly |
| `not_authorized` (`42501`) | RLS or function auth check failed | Verify user's `university_memberships.status = 'verified'` for the target university |
| `blocked` | Conversation attempted between blocked users | Expected behaviour — no action needed |
| `rate_limited` | > 30 messages/minute from one user | Check for bot/spam activity; consider reducing the limit via `ALTER DATABASE` |
| `no_enquiry` | `record_exchange()` called but buyer never messaged | Valid guard; seller UI should check for messages before showing the "Mark sold" button |
| `invalid_conversation` | `record_exchange()` called with wrong conv/listing pair | Potential CSRF/tampering — log the user_id and investigate |
| `not_eligible` | `submit_review()` called on non-confirmed exchange | Exchange must be `confirmed` by buyer before reviews are possible |
| `already_reviewed` | Duplicate `submit_review()` call | Idempotency guard — safe to ignore |
| `unavailable` | `start_topic_conversation()` called on closed request/report | Topic was closed between page load and submit — safe to retry |
| `not_authenticated` | `delete_own_account()` called without a session | Should never happen through the UI — investigate if seen |

---

## Incident Response

### 1. Users can't sign in

**Symptoms:** Auth errors, redirect loops on `/sign-in`.

**Check:**
```bash
# Verify Supabase Auth service status
curl https://status.supabase.com/api/v2/status.json

# Check env vars are set on Vercel
vercel env ls
```

**Common causes:**
- `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` changed/rotated.
- Auth redirect URL missing from Supabase → **Authentication → URL Configuration**.
- Supabase auth service degraded (check status page).

---

### 2. Listings / messages not loading (blank pages)

**Symptoms:** Pages render but data is missing; no visible error.

**Check:**
```sql
-- Verify RLS is not blocking everything (run as postgres/service role)
select count(*) from public.listings where status = 'active';
select count(*) from public.university_memberships where status = 'verified';
```

**Common causes:**
- User's `university_memberships.status` is `pending` (not `verified`) — redirect them to onboarding.
- `is_verified_member()` function broken — test manually: `select public.is_verified_member('<uid>', '<uni_id>')`.

---

### 3. Messages not appearing in real time

**Symptoms:** Users have to refresh to see new messages.

**Check:**
- Supabase Dashboard → **Database → Replication** — confirm `public.messages` is in the `supabase_realtime` publication.
- Browser console for WebSocket errors.
- Check `src/components/chat.tsx` subscription setup.

**Fix:**
```sql
-- Re-add if accidentally dropped
alter publication supabase_realtime add table public.messages;
```

---

### 4. Images not loading (broken image icons)

**Symptoms:** Signed URLs return 400/403.

**Check:**
- Signed URLs expire after 1 hour — stale SSR cache can serve expired URLs.
- Storage bucket policies in Supabase Dashboard → **Storage → Policies**.

**Fix:**
- Ensure pages using images are not statically cached (`export const dynamic = 'force-dynamic'` as a fallback).
- Verify storage policy `listing_images_view` is in place.

---

### 5. Build failing on Vercel

**Common causes and fixes:**

| Error | Fix |
|---|---|
| `Cannot find native binding` (@tailwindcss/oxide) | Ensure Vercel Node version is set to **20.x** |
| TypeScript errors | Run `npm run typecheck` locally to catch before push |
| Missing env vars | Add to Vercel Dashboard → Environment Variables |
| `outputFileTracingRoot` warning | See `deployment.md` §3.4 |

---

### 6. Spam / abusive listings

1. Moderator uses the **Moderation** admin panel → opens the report → clicks **Remove**.
2. If the moderator panel is unavailable, run SQL directly (see `operations.md` §5).
3. If the user is creating multiple accounts, suspend via membership and flag the email domain.

---

### 7. GDPR / data deletion request

1. Ask for the user's email address.
2. Find the user: `select id from auth.users where email = 'user@example.com';`
3. Run the deletion (see `operations.md` §6).
4. Confirm deletion: `select id from auth.users where email = 'user@example.com';` — should return 0 rows.
5. Log the request and deletion date in your compliance tracker.

---

## Escalation

| Severity | Contact | SLA |
|---|---|---|
| P1 — service down | On-call engineer (pager) | 15 min response |
| P2 — major feature broken | Engineering lead (Slack) | 2 hr response |
| P3 — minor bug / UX issue | Create GitHub issue | Next sprint |
| Security vulnerability | security@ + private GitHub issue | Immediate |

---

## Useful Links

- [Supabase Status](https://status.supabase.com)
- [Vercel Status](https://www.vercel-status.com)
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Dashboard](https://supabase.com/dashboard)
