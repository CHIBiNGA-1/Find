-- pgTAP test suite: cross-university data isolation
-- Run with: supabase test db
-- Requires pgTAP extension (bundled with Supabase local dev).

begin;
select plan(22);

-- ── Fixtures ──────────────────────────────────────────────────────────────────
-- Two universities
insert into public.universities (id, slug, name, country_code, currency_code, timezone)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'uni-a', 'University A', 'ZM', 'ZMW', 'Africa/Lusaka'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'uni-b', 'University B', 'ZM', 'ZMW', 'Africa/Lusaka');

-- Two auth users (bypass trigger by inserting profiles directly)
insert into auth.users (id, email, role, aud, encrypted_password, raw_user_meta_data, created_at, updated_at)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'alice@uni-a.test', 'authenticated', 'authenticated', 'x', '{"display_name":"Alice"}', now(), now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@uni-b.test',   'authenticated', 'authenticated', 'x', '{"display_name":"Bob"}',   now(), now());

insert into public.profiles (id, display_name) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Alice'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Bob');

-- Verified membership: Alice → Uni-A, Bob → Uni-B
insert into public.university_memberships (user_id, university_id, status, role)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'verified', 'student'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'verified', 'student');

-- A category
insert into public.categories (id, slug, name) values ('cccccccc-0000-0000-0000-000000000001', 'books', 'Books');

-- Active listing owned by Alice in Uni-A
insert into public.listings (id, university_id, seller_id, category_id, title, description, price_minor, currency_code, condition, status, published_at)
values ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
        'Calculus Textbook', 'Good condition', 5000, 'ZMW', 'good', 'active', now());

-- Open request from Alice in Uni-A
insert into public.requests (id, university_id, author_id, title, description, currency_code, expires_at)
values ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001', 'Need a Calculator', '', 'ZMW', now() + interval '7 days');

-- Open lost-and-found from Alice in Uni-A
insert into public.lost_found_reports (id, university_id, reporter_id, kind, title, description, area, occurred_on)
values ('ffffffff-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001', 'lost', 'Blue Pen', '', 'Library', current_date);

-- ── Helper: set_user_id(uid) impersonates a user within pgTAP tests ───────────
-- We use set_config to mimic auth.uid() the same way Supabase does.
create or replace function tests.set_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;

-- ── is_verified_member() ─────────────────────────────────────────────────────

select ok(
  public.is_verified_member('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Alice is a verified member of Uni-A'
);
select ok(
  not public.is_verified_member('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002'),
  'Alice is NOT a verified member of Uni-B'
);
select ok(
  not public.is_verified_member('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Bob is NOT a verified member of Uni-A'
);

-- ── Listings isolation (RLS as Bob, Uni-B member) ────────────────────────────

set role authenticated;
set request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';

select is(
  (select count(*)::int from public.listings where id = 'dddddddd-0000-0000-0000-000000000001'),
  0,
  'Bob cannot see Alice''s Uni-A listing'
);

set request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  (select count(*)::int from public.listings where id = 'dddddddd-0000-0000-0000-000000000001'),
  1,
  'Alice can see her own listing'
);

-- ── Requests isolation ───────────────────────────────────────────────────────

set request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';

select is(
  (select count(*)::int from public.requests where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  0,
  'Bob cannot see Uni-A requests'
);

set request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  (select count(*)::int from public.requests where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  1,
  'Alice can see her Uni-A request'
);

-- ── Lost-and-found isolation ─────────────────────────────────────────────────

set request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';

select is(
  (select count(*)::int from public.lost_found_reports where id = 'ffffffff-0000-0000-0000-000000000001'),
  0,
  'Bob cannot see Uni-A lost-and-found reports'
);

set request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  (select count(*)::int from public.lost_found_reports where id = 'ffffffff-0000-0000-0000-000000000001'),
  1,
  'Alice can see her Uni-A lost-and-found report'
);

-- ── Profiles isolation: Bob cannot see Alice's profile ───────────────────────
-- (They share no university, so no common membership)

set request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';

select is(
  (select count(*)::int from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  0,
  'Bob cannot see Alice''s profile (different universities)'
);

-- ── Listing insert cross-university blocked ──────────────────────────────────
-- Bob (Uni-B) must not be able to INSERT a listing in Uni-A

set request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';

select throws_ok(
  $$insert into public.listings (university_id, seller_id, category_id, title, description, price_minor, currency_code, condition, status)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
            'cccccccc-0000-0000-0000-000000000001', 'Smuggled Listing', '', 100, 'ZMW', 'good', 'active')$$,
  'new row violates row-level security policy',
  'Bob cannot insert a listing in Uni-A'
);

-- ── Membership immutability: user cannot self-elevate to moderator ────────────

set request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}';

select throws_ok(
  $$insert into public.university_memberships (user_id, university_id, status, role)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'pending', 'moderator')$$,
  'new row violates row-level security policy',
  'A student cannot self-assign moderator role'
);

select throws_ok(
  $$insert into public.university_memberships (user_id, university_id, status, role)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'verified', 'student')$$,
  'new row violates row-level security policy',
  'A student cannot self-verify their own membership'
);

-- ── Listing status transition rules (trigger) ─────────────────────────────────

reset role;  -- superuser for direct manipulation

-- 'sold' → 'active' is not a valid transition
select throws_ok(
  $$update public.listings set status = 'sold' where id = 'dddddddd-0000-0000-0000-000000000001';
    update public.listings set status = 'active' where id = 'dddddddd-0000-0000-0000-000000000001'$$,
  'P0001',
  'invalid_status_transition',
  'Cannot transition from sold back to active'
);

-- seller_id is immutable
select throws_ok(
  $$update public.listings set seller_id = 'bbbbbbbb-0000-0000-0000-000000000002'
    where id = 'dddddddd-0000-0000-0000-000000000001'$$,
  'P0001',
  'listing_scope_immutable',
  'seller_id cannot be changed'
);

-- university_id is immutable
select throws_ok(
  $$update public.listings set university_id = 'aaaaaaaa-0000-0000-0000-000000000002'
    where id = 'dddddddd-0000-0000-0000-000000000001'$$,
  'P0001',
  'listing_scope_immutable',
  'university_id cannot be changed'
);

-- ── Request scope immutability (trigger) ──────────────────────────────────────

select throws_ok(
  $$update public.requests set university_id = 'aaaaaaaa-0000-0000-0000-000000000002'
    where id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  'P0001',
  'scope_immutable',
  'Request university_id cannot be changed'
);

-- A request that is not open cannot change status again
update public.requests set status = 'fulfilled' where id = 'eeeeeeee-0000-0000-0000-000000000001';
select throws_ok(
  $$update public.requests set status = 'closed' where id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  'P0001',
  'invalid_status_transition',
  'Cannot change status of a non-open request'
);

-- ── start_conversation() cross-university rejection ───────────────────────────
-- Bob (Uni-B) trying to start a conversation on Alice's Uni-A listing
-- Must raise 'not_authorized' because Bob is not a verified member of Uni-A.

set role authenticated;
set request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';

-- Reset the listing back to active first (as superuser)
reset role;
update public.listings set status = 'active' where id = 'dddddddd-0000-0000-0000-000000000001';
set role authenticated;
set request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';

select throws_ok(
  $$select public.start_conversation('dddddddd-0000-0000-0000-000000000001')$$,
  '42501',
  'not_authorized',
  'Bob (Uni-B) cannot start a conversation on a Uni-A listing'
);

select finish();
rollback;
