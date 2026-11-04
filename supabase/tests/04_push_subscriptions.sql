-- pgTAP: migration 0012 (push subscriptions).
begin;
select plan(9);

insert into public.universities (id, slug, name, country_code) values ('a4000000-0000-0000-0000-000000000001','uni-p','Uni P','ZM');
insert into auth.users (id, email, role, aud, encrypted_password, raw_user_meta_data, created_at, updated_at) values
  ('b4000000-0000-0000-0000-000000000001','a@p.test','authenticated','authenticated','x','{"display_name":"Alice"}',now(),now()),
  ('b4000000-0000-0000-0000-000000000002','b@p.test','authenticated','authenticated','x','{"display_name":"Bobby"}',now(),now());

set local role authenticated;
set local request.jwt.claims to '{"sub":"b4000000-0000-0000-0000-000000000001","role":"authenticated"}';
select public.register_push_subscription('https://push.example/ep1', 'key1', 'auth1', 'TestBrowser');
select is((select count(*)::int from public.push_subscriptions), 1, 'a person can register a subscription');

select throws_ok($$insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ('b4000000-0000-0000-0000-000000000001','https://push.example/direct','k','a')$$,
  '42501', null, 'direct inserts are refused (registration goes through the function)');
select throws_ok($$select public.register_push_subscription('http://insecure.example/ep', 'k', 'a')$$, '23514', null, 'a non-https endpoint is rejected');

set local request.jwt.claims to '{"sub":"b4000000-0000-0000-0000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.push_subscriptions), 0, 'another person cannot see it');
delete from public.push_subscriptions;
reset role;
select is((select count(*)::int from public.push_subscriptions), 1, 'another person cannot delete it');

-- shared device: the same endpoint now belongs to B, and A no longer receives anything on it
set local role authenticated;
select public.register_push_subscription('https://push.example/ep1', 'key2', 'auth2');
select is((select count(*)::int from public.push_subscriptions), 1, 'B now owns the shared-device endpoint');
set local request.jwt.claims to '{"sub":"b4000000-0000-0000-0000-000000000001","role":"authenticated"}';
select is((select count(*)::int from public.push_subscriptions), 0, 'A no longer has it');

set local request.jwt.claims to '{"sub":"b4000000-0000-0000-0000-000000000002","role":"authenticated"}';
delete from public.push_subscriptions;
select is((select count(*)::int from public.push_subscriptions), 0, 'a person can delete their own subscription (switching notifications off)');

reset role; set local role anon;
select throws_ok($$select public.register_push_subscription('https://push.example/anon', 'k', 'a')$$, '42501', null, 'signed-out callers cannot register');

select * from finish();
rollback;
