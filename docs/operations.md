# f!nd — Operations Guide

This document covers day-to-day operations: adding universities, promoting moderators, configuring rate limits, monitoring, and common admin tasks.

---

## 1. Adding a University

Insert directly into the `universities` table using the Supabase SQL editor or `psql`:

```sql
insert into public.universities (slug, name, country_code, currency_code, timezone, verification_strategy, email_domains)
values (
  'unza',              -- URL-safe slug, used in internal references
  'University of Zambia',
  'ZM',
  'ZMW',
  'Africa/Lusaka',
  'manual_review',    -- only implemented verification strategy in this release
  array[]::text[]
);
```

> **Slugs are permanent.** Once set they appear in moderation audit logs. Choose carefully. Email-domain auto-verification and institutional SSO are not implemented; do not configure either strategy until those flows are built and tested.

---

## 2. Promoting a Moderator

Find the user's `university_memberships` row and set `role = 'moderator'`:

```sql
update public.university_memberships
   set role = 'moderator'
 where user_id = (select id from auth.users where email = 'moderator@example.com')
   and university_id = (select id from public.universities where slug = 'unza')
   and status = 'verified';
```

To promote to full admin (can moderate any membership including other moderators):

```sql
update public.university_memberships set role = 'admin' where ...;
```

> Moderators can only act within their own university. This is enforced in every security-definer function.

---

## 3. Message Rate Limit

The default rate limit is **30 messages per minute per user**, defined as a database setting.
Change it per-database without a code deploy:

```sql
-- Reduce to 20 messages/minute
alter database postgres set app.message_rate_per_minute = '20';

-- Restore default
alter database postgres reset app.message_rate_per_minute;
```

Changes take effect for new connections; existing sessions pick it up at next query.

---

## 4. Manually Suspending a User

If a user must be suspended immediately (before a moderator can act through the UI):

```sql
update public.university_memberships
   set status = 'suspended',
       verified_at = null
 where user_id = '<user-uuid>'
   and role = 'student';      -- never suspend the last admin
```

To re-instate:

```sql
update public.university_memberships
   set status = 'verified',
       verified_at = now()
 where user_id = '<user-uuid>';
```

---

## 5. Removing Content

### Remove a listing (moderator action via UI or SQL)

```sql
update public.listings set status = 'removed' where id = '<listing-uuid>';
```

### Hide a review

```sql
update public.reviews set status = 'hidden' where id = '<review-uuid>';
```

### Close a request

```sql
update public.requests set status = 'closed' where id = '<request-uuid>' and status = 'open';
```

---

## 6. Account Deletion (User-initiated)

The supported self-service path is the in-app account deletion flow. For an exceptional administrator-assisted request, follow the same data-removal procedure only after verifying the request and recording the authorization. Do not directly delete the auth row without first removing storage objects and exchange records:

```sql
-- Run only as a controlled, reviewed operation. The application migration
-- 0010 first deletes exchange_records involving this user because their
-- conversation FK uses ON DELETE RESTRICT.
delete from public.exchange_records where seller_id = '<uuid>' or buyer_id = '<uuid>';
update public.profiles set display_name = 'Deleted User', avatar_path = null where id = '<uuid>';
update public.university_memberships set status = 'suspended' where user_id = '<uuid>';
delete from auth.users where id = '<uuid>'; -- dependent profile/content rows cascade
```

---

## 7. Monitoring

### Key metrics to watch (Supabase Dashboard → Reports)

| Metric | Threshold to investigate |
|---|---|
| Auth error rate | > 1% of requests |
| DB connection count | > 80% of pool size |
| Storage bandwidth | > 80% of plan limit |
| Row count growth (`listings`) | Unexpected spikes may indicate spam |

### Useful SQL for ops

```sql
-- Active user count per university (last 7 days)
select u.name, count(distinct m.sender_id)
from public.messages m
join public.conversations c on c.id = m.conversation_id
join public.universities u on u.id = c.university_id
where m.created_at > now() - interval '7 days'
group by u.name order by 2 desc;

-- Open reports older than 48 hours (needs attention)
select r.id, r.target_type, r.reason, r.created_at, u.name as university
from public.reports r join public.universities u on u.id = r.university_id
where r.status = 'open' and r.created_at < now() - interval '48 hours'
order by r.created_at;

-- Pending memberships older than 24 hours
select p.display_name, u.name, m.created_at
from public.university_memberships m
join public.profiles p on p.id = m.user_id
join public.universities u on u.id = m.university_id
where m.status = 'pending' and m.created_at < now() - interval '24 hours';
```

---

## 8. Rolling Back a Migration

Supabase doesn't auto-generate rollbacks. If a migration must be undone:

1. Write a reverse migration manually (`0008_rollback_xxx.sql`).
2. Apply it: `supabase db push` or run via the SQL editor.
3. Never delete or modify historical migration files — audit trails depend on them.

---

## 9. Supabase Realtime

Messages are published to the `supabase_realtime` publication (set in `0004_messaging.sql`).
RLS on `public.messages` still filters what each subscribing client receives — no extra configuration needed.

If realtime disconnects spike, check:
- Supabase Dashboard → Database → Replication — confirm `supabase_realtime` is enabled.
- Client reconnect logic in `src/components/chat.tsx`.


## Account deletion hardening

Migration `0010_account_deletion_exchange_cleanup.sql` removes exchange records involving the account before deleting the auth user. This is required because exchange records restrict deletion of their associated conversations. The application also removes storage objects first and aborts account deletion if storage enumeration or removal fails. Validate this path against a disposable Supabase project containing listings, lost-and-found photos, message photos, conversations, exchanges and reviews before enabling public registration.
