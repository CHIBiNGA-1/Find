-- pgTAP test suite: conversation privacy
-- Run with: supabase test db
-- Requires pgTAP extension (bundled with Supabase local dev).

begin;
select plan(18);

-- ── Fixtures ──────────────────────────────────────────────────────────────────

insert into public.universities (id, slug, name, country_code, currency_code, timezone)
values ('aaaaaaaa-0001-0000-0000-000000000001', 'uni-conv', 'Conv University', 'ZM', 'ZMW', 'Africa/Lusaka');

-- Four users: Alice & Bob share a conversation; Carol & Dave share another.
-- Eve is a verified member of the same university but not in any conversation.
insert into auth.users (id, email, role, aud, encrypted_password, raw_user_meta_data, created_at, updated_at)
values
  ('bbbbbbbb-0001-0000-0000-000000000001', 'alice@conv.test', 'authenticated', 'authenticated', 'x', '{"display_name":"Alice"}', now(), now()),
  ('bbbbbbbb-0001-0000-0000-000000000002', 'bob@conv.test',   'authenticated', 'authenticated', 'x', '{"display_name":"Bob"}',   now(), now()),
  ('bbbbbbbb-0001-0000-0000-000000000003', 'carol@conv.test', 'authenticated', 'authenticated', 'x', '{"display_name":"Carol"}', now(), now()),
  ('bbbbbbbb-0001-0000-0000-000000000004', 'dave@conv.test',  'authenticated', 'authenticated', 'x', '{"display_name":"Dave"}',  now(), now()),
  ('bbbbbbbb-0001-0000-0000-000000000005', 'eve@conv.test',   'authenticated', 'authenticated', 'x', '{"display_name":"Eve"}',   now(), now());

insert into public.profiles (id, display_name) values
  ('bbbbbbbb-0001-0000-0000-000000000001', 'Alice'),
  ('bbbbbbbb-0001-0000-0000-000000000002', 'Bob'),
  ('bbbbbbbb-0001-0000-0000-000000000003', 'Carol'),
  ('bbbbbbbb-0001-0000-0000-000000000004', 'Dave'),
  ('bbbbbbbb-0001-0000-0000-000000000005', 'Eve')
  on conflict (id) do update set display_name = excluded.display_name;

insert into public.university_memberships (user_id, university_id, status, role) values
  ('bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001', 'verified', 'student'),
  ('bbbbbbbb-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000001', 'verified', 'student'),
  ('bbbbbbbb-0001-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000001', 'verified', 'student'),
  ('bbbbbbbb-0001-0000-0000-000000000004', 'aaaaaaaa-0001-0000-0000-000000000001', 'verified', 'student'),
  ('bbbbbbbb-0001-0000-0000-000000000005', 'aaaaaaaa-0001-0000-0000-000000000001', 'verified', 'student');

-- Conversation A: Alice (buyer) ↔ Bob (seller)
insert into public.conversations (id, university_id, buyer_id, seller_id)
values ('cccccccc-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001',
        'bbbbbbbb-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000002');

-- Conversation B: Carol (buyer) ↔ Dave (seller)
insert into public.conversations (id, university_id, buyer_id, seller_id)
values ('cccccccc-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000001',
        'bbbbbbbb-0001-0000-0000-000000000003', 'bbbbbbbb-0001-0000-0000-000000000004');

-- Two messages in conv-A (one from each side)
insert into public.messages (id, conversation_id, sender_id, client_id, body) values
  ('dddddddd-0001-0000-0000-000000000001', 'cccccccc-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000001', gen_random_uuid(), 'Hi Bob, still available?'),
  ('dddddddd-0001-0000-0000-000000000002', 'cccccccc-0001-0000-0000-000000000001',
   'bbbbbbbb-0001-0000-0000-000000000002', gen_random_uuid(), 'Yes, come by tomorrow.');

-- Two messages in conv-B
insert into public.messages (id, conversation_id, sender_id, client_id, body) values
  ('dddddddd-0001-0000-0000-000000000003', 'cccccccc-0001-0000-0000-000000000002',
   'bbbbbbbb-0001-0000-0000-000000000003', gen_random_uuid(), 'Hi Dave, is this still for sale?'),
  ('dddddddd-0001-0000-0000-000000000004', 'cccccccc-0001-0000-0000-000000000002',
   'bbbbbbbb-0001-0000-0000-000000000004', gen_random_uuid(), 'Yes it is!');

-- ── is_participant() helper ───────────────────────────────────────────────────

select ok(
  public.is_participant('cccccccc-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001'),
  'Alice is a participant of conv-A'
);
select ok(
  public.is_participant('cccccccc-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000002'),
  'Bob is a participant of conv-A'
);
select ok(
  not public.is_participant('cccccccc-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000003'),
  'Carol is NOT a participant of conv-A'
);
select ok(
  not public.is_participant('cccccccc-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000005'),
  'Eve (university member, no conversation) is NOT a participant of conv-A'
);

-- ── Conversation RLS: participants can read their own; others cannot ──────────

set role authenticated;

set request.jwt.claims to '{"sub":"bbbbbbbb-0001-0000-0000-000000000001","role":"authenticated"}';
select is(
  (select count(*)::int from public.conversations where id = 'cccccccc-0001-0000-0000-000000000001'),
  1, 'Alice can see conv-A'
);
select is(
  (select count(*)::int from public.conversations where id = 'cccccccc-0001-0000-0000-000000000002'),
  0, 'Alice cannot see conv-B'
);

set request.jwt.claims to '{"sub":"bbbbbbbb-0001-0000-0000-000000000005","role":"authenticated"}';
select is(
  (select count(*)::int from public.conversations),
  0, 'Eve (no conversations) sees no conversations'
);

-- ── Message RLS ───────────────────────────────────────────────────────────────

set request.jwt.claims to '{"sub":"bbbbbbbb-0001-0000-0000-000000000001","role":"authenticated"}';
select is(
  (select count(*)::int from public.messages where conversation_id = 'cccccccc-0001-0000-0000-000000000001'),
  2, 'Alice can read both messages in conv-A'
);
select is(
  (select count(*)::int from public.messages where conversation_id = 'cccccccc-0001-0000-0000-000000000002'),
  0, 'Alice cannot read any message in conv-B'
);

set request.jwt.claims to '{"sub":"bbbbbbbb-0001-0000-0000-000000000003","role":"authenticated"}';
select is(
  (select count(*)::int from public.messages where conversation_id = 'cccccccc-0001-0000-0000-000000000001'),
  0, 'Carol cannot read any message in conv-A'
);
select is(
  (select count(*)::int from public.messages where conversation_id = 'cccccccc-0001-0000-0000-000000000002'),
  2, 'Carol can read both messages in conv-B'
);

-- ── Message INSERT RLS: non-participant cannot send ──────────────────────────

set request.jwt.claims to '{"sub":"bbbbbbbb-0001-0000-0000-000000000003","role":"authenticated"}';

select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, client_id, body)
    values ('cccccccc-0001-0000-0000-000000000001',
            'bbbbbbbb-0001-0000-0000-000000000003', gen_random_uuid(), 'Intruding!')$$,
  null,   -- Postgres appends the table name; assert the SQLSTATE only
  'Carol cannot send a message into conv-A'
);

set request.jwt.claims to '{"sub":"bbbbbbbb-0001-0000-0000-000000000005","role":"authenticated"}';

select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, client_id, body)
    values ('cccccccc-0001-0000-0000-000000000001',
            'bbbbbbbb-0001-0000-0000-000000000005', gen_random_uuid(), 'Eve snooping!')$$,
  null,   -- Postgres appends the table name; assert the SQLSTATE only
  'Eve cannot send a message into conv-A'
);

-- ── Block prevents messages ───────────────────────────────────────────────────

reset role;
-- Alice blocks Bob
insert into public.blocks (blocker_id, blocked_id) values
  ('bbbbbbbb-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000002');

select ok(
  public.is_blocked_between('bbbbbbbb-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000002'),
  'is_blocked_between returns true when Alice blocks Bob'
);
select ok(
  public.is_blocked_between('bbbbbbbb-0001-0000-0000-000000000002', 'bbbbbbbb-0001-0000-0000-000000000001'),
  'is_blocked_between is symmetric (Bob blocked by Alice)'
);

set role authenticated;
set request.jwt.claims to '{"sub":"bbbbbbbb-0001-0000-0000-000000000002","role":"authenticated"}';

select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, client_id, body)
    values ('cccccccc-0001-0000-0000-000000000001',
            'bbbbbbbb-0001-0000-0000-000000000002', gen_random_uuid(), 'Trying again!')$$,
  null,   -- Postgres appends the table name; assert the SQLSTATE only
  'Bob cannot send a message when blocked by Alice'
);

-- ── mark_read: non-participant cannot mark a conversation as read ─────────────

set request.jwt.claims to '{"sub":"bbbbbbbb-0001-0000-0000-000000000003","role":"authenticated"}';

select throws_ok(
  $$select public.mark_read('cccccccc-0001-0000-0000-000000000001')$$,
  '42501',
  'not_authorized',
  'Carol cannot mark conv-A as read'
);

-- ── conversation_reads RLS: user sees only their own read receipts ────────────

reset role;
insert into public.conversation_reads (conversation_id, user_id, last_read_at) values
  ('cccccccc-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001', now());

set role authenticated;
set request.jwt.claims to '{"sub":"bbbbbbbb-0001-0000-0000-000000000002","role":"authenticated"}';

select is(
  (select count(*)::int from public.conversation_reads
   where conversation_id = 'cccccccc-0001-0000-0000-000000000001'),
  0, 'Bob cannot see Alice''s read receipt'
);

select finish();
rollback;
