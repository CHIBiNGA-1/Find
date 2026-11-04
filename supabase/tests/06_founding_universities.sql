-- pgTAP: migration 0014 (founding, promotion, closure, and duplicate protection).
begin;
select plan(13);

insert into public.universities (id, slug, name, country_code)
values ('a6000000-0000-0000-0000-000000000001', 'unza', 'University of Zambia', 'ZM');
insert into auth.users (id, email, role, aud, encrypted_password, raw_user_meta_data, created_at, updated_at) values
  ('b6000000-0000-0000-0000-000000000001','founder@test.test','authenticated','authenticated','x','{"display_name":"Founder"}',now(),now()),
  ('b6000000-0000-0000-0000-000000000002','second@test.test','authenticated','authenticated','x','{"display_name":"Second"}',now(),now()),
  ('b6000000-0000-0000-0000-000000000003','third@test.test','authenticated','authenticated','x','{"display_name":"Third"}',now(),now());

set local role authenticated;
set local request.jwt.claims to '{"sub":"b6000000-0000-0000-0000-000000000001","role":"authenticated"}';
select is((select days from public.founding_terms()), 30, 'default founding period is 30 days');
select is((select members from public.founding_terms()), 15, 'default founding target is 15 members');
select public.found_university('Northern Heights University');
select is((select status from public.universities where slug = 'northern-heights-university'), 'probation', 'a new university starts in probation');
select is((select role from public.university_memberships where user_id = auth.uid() and university_id = (select id from public.universities where slug = 'northern-heights-university')), 'moderator', 'the founder becomes a moderator');
select is((select count(*)::int from public.moderation_actions where action = 'university_founded'), 1, 'founding is recorded in the moderator audit');
select throws_ok($$select public.found_university('New Campus')$$, 'P0001', 'already_founded', 'one account cannot found multiple universities');

set local request.jwt.claims to '{"sub":"b6000000-0000-0000-0000-000000000002","role":"authenticated"}';
select throws_ok($$select public.found_university('University of Zambia')$$, 'P0001', 'exists', 'an exact existing name is rejected');
select throws_ok($$select public.found_university('University of Zambiya')$$, 'P0001', 'similar_exists:University of Zambia', 'a near-duplicate name is flagged');
select public.found_university('University of Zambiya', true);
select is((select count(*)::int from public.universities where name = 'University of Zambiya'), 1, 'the founder can confirm a genuinely distinct near-match');
select is((select members from public.university_progress((select id from public.universities where name = 'University of Zambiya'))), 1, 'founding progress counts verified members');

reset role;
update public.universities set target_members = 1 where name = 'University of Zambiya';
set local role authenticated;
select is((select public.evaluate_university((select id from public.universities where name = 'University of Zambiya'))), 'active', 'reaching the target promotes the university');

reset role;
update public.universities set probation_ends_at = now() - interval '1 day' where name = 'Northern Heights University';
set local role authenticated;
set local request.jwt.claims to '{"sub":"b6000000-0000-0000-0000-000000000001","role":"authenticated"}';
select is((select public.evaluate_university((select id from public.universities where name = 'Northern Heights University'))), 'closed', 'an expired founding period closes the university');
select ok(not public.is_verified_member(auth.uid(), (select id from public.universities where name = 'Northern Heights University')), 'closed university membership no longer authorizes access');

reset role;
select * from finish();
rollback;
