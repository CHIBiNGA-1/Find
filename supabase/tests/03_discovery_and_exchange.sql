-- pgTAP: migration 0011 (subcategories, sorted search, read receipts, previews, declined exchange).
begin;
select plan(23);

insert into public.universities (id, slug, name, country_code) values ('a3000000-0000-0000-0000-000000000001','uni-t','Uni T','ZM');
insert into auth.users (id, email, role, aud, encrypted_password, raw_user_meta_data, created_at, updated_at) values
  ('b3000000-0000-0000-0000-000000000001','alice@t.test','authenticated','authenticated','x','{"display_name":"Alice"}',now(),now()),
  ('b3000000-0000-0000-0000-000000000002','bob@t.test','authenticated','authenticated','x','{"display_name":"Bob"}',now(),now()),
  ('b3000000-0000-0000-0000-000000000003','carol@t.test','authenticated','authenticated','x','{"display_name":"Carol"}',now(),now());
insert into public.university_memberships (user_id, university_id, status) select id, 'a3000000-0000-0000-0000-000000000001', 'verified' from auth.users where email like '%@t.test';

insert into public.listings (id, university_id, seller_id, category_id, title, price_minor, currency_code, condition, status) values
  ('d3000000-0000-0000-0000-000000000001','a3000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000001',(select id from public.categories where slug='textbooks-course'),'Calculus book',3000,'ZMW','good','active'),
  ('d3000000-0000-0000-0000-000000000002','a3000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000001',(select id from public.categories where slug='electronics'),'Cheap lamp',1000,'ZMW','good','active'),
  ('d3000000-0000-0000-0000-000000000003','a3000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000001',(select id from public.categories where slug='electronics'),'Fancy laptop',90000,'ZMW','like_new','active');
insert into public.conversations (id, university_id, listing_id, buyer_id, seller_id) values
  ('c3000000-0000-0000-0000-000000000001','a3000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000002','b3000000-0000-0000-0000-000000000002','b3000000-0000-0000-0000-000000000001');
insert into public.messages (conversation_id, sender_id, client_id, body, created_at) values
  ('c3000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000002',gen_random_uuid(),'Is this still available?', now() - interval '2 minutes'),
  ('c3000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000001',gen_random_uuid(),'Yes it is', now() - interval '1 minute');

-- ── search v2 ───────────────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"b3000000-0000-0000-0000-000000000002","role":"authenticated"}';

select is((select count(*)::int from public.search_listings(uni => 'a3000000-0000-0000-0000-000000000001', cat => (select id from public.categories where slug='textbooks'))), 1,
  'a parent category also returns listings filed under its subcategories');
select is((select count(*)::int from public.search_listings(uni => 'a3000000-0000-0000-0000-000000000001', cat => (select id from public.categories where slug='textbooks-course'))), 1,
  'a subcategory returns its own listing');
select is((select title from public.search_listings(uni => 'a3000000-0000-0000-0000-000000000001', sort => 'price_asc') limit 1), 'Cheap lamp', 'price_asc starts with the cheapest');
select is((select title from public.search_listings(uni => 'a3000000-0000-0000-0000-000000000001', sort => 'price_desc') limit 1), 'Fancy laptop', 'price_desc starts with the dearest');
select is((select title from public.search_listings(uni => 'a3000000-0000-0000-0000-000000000001', sort => 'price_asc', cursor_price => 1000, cursor_id => 'd3000000-0000-0000-0000-000000000002') limit 1),
  'Calculus book', 'price cursor continues after the last item seen');
select is((select count(*)::int from public.search_listings(uni => 'a3000000-0000-0000-0000-000000000001')), 3, 'calls that omit the new arguments still work (previous app build)');

-- ── relevance ───────────────────────────────────────────────────────────────────────
select is((select title from public.search_listings(uni => 'a3000000-0000-0000-0000-000000000001', q => 'laptop', sort => 'relevant') limit 1), 'Fancy laptop', 'relevance puts the title match first');
select is((select count(*)::int from public.search_listings(uni => 'a3000000-0000-0000-0000-000000000001', q => 'laptop', sort => 'relevant', rank_offset => 1)), 0, 'relevance paging by offset skips what was already shown');
select is((select title from public.search_listings(uni => 'a3000000-0000-0000-0000-000000000001', q => 'lamp', sort => 'relevant') limit 1), 'Cheap lamp', 'an exact title match outranks a merely similar one (fuzzy matches still appear below it)');

-- ── read receipts and previews ───────────────────────────────────────────────────────
select is(public.peer_last_read('c3000000-0000-0000-0000-000000000001'), null::timestamptz, 'Bob sees no read time before Alice has read');
select is((select body from public.conversation_previews()), 'Yes it is', 'the preview is the latest message');
set local request.jwt.claims to '{"sub":"b3000000-0000-0000-0000-000000000001","role":"authenticated"}';
select public.mark_read('c3000000-0000-0000-0000-000000000001');
set local request.jwt.claims to '{"sub":"b3000000-0000-0000-0000-000000000002","role":"authenticated"}';
select isnt(public.peer_last_read('c3000000-0000-0000-0000-000000000001'), null::timestamptz, 'Bob sees when Alice last read');
set local request.jwt.claims to '{"sub":"b3000000-0000-0000-0000-000000000003","role":"authenticated"}';
select throws_ok($$select public.peer_last_read('c3000000-0000-0000-0000-000000000001')$$, '42501', 'not_authorized', 'a non-participant cannot read read-state');
select is((select count(*)::int from public.conversation_previews()), 0, 'a non-participant gets no previews');

-- ── declined exchange relists ────────────────────────────────────────────────────────
set local request.jwt.claims to '{"sub":"b3000000-0000-0000-0000-000000000001","role":"authenticated"}';
select public.record_exchange('d3000000-0000-0000-0000-000000000002', 'c3000000-0000-0000-0000-000000000001');
select throws_ok($$update public.listings set status='active' where id='d3000000-0000-0000-0000-000000000002'$$, 'P0001', 'invalid_status_transition',
  'a seller still cannot flip a sold listing back to active directly');
set local request.jwt.claims to '{"sub":"b3000000-0000-0000-0000-000000000002","role":"authenticated"}';
select public.confirm_exchange((select id from public.exchange_records limit 1), false);
reset role;
select is((select status from public.listings where id='d3000000-0000-0000-0000-000000000002'), 'active', 'declining the exchange puts the listing back on sale');
select throws_ok($$update public.listings set campus_area = repeat('x', 121) where id='d3000000-0000-0000-0000-000000000001'$$, '23514', null, 'campus_area is length-limited');

-- ── photo positions ──────────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"b3000000-0000-0000-0000-000000000001","role":"authenticated"}';
select public.register_listing_image('d3000000-0000-0000-0000-000000000001','b3/d3/a.webp',800,600);
select public.register_listing_image('d3000000-0000-0000-0000-000000000001','b3/d3/b.webp',800,600);
select public.register_listing_image('d3000000-0000-0000-0000-000000000001','b3/d3/c.webp',800,600);
select is((select array_agg(position order by position)::text from public.listing_images where listing_id='d3000000-0000-0000-0000-000000000001'), '{0,1,2}', 'positions are assigned sequentially by the server');
select public.reorder_listing_images('d3000000-0000-0000-0000-000000000001',
  array(select id from public.listing_images where listing_id='d3000000-0000-0000-0000-000000000001' order by storage_path desc));
select is((select storage_path from public.listing_images where listing_id='d3000000-0000-0000-0000-000000000001' and position=0), 'b3/d3/c.webp', 'reordering moves the chosen photo to the cover position');
delete from public.listing_images where storage_path = 'b3/d3/c.webp';
select public.reorder_listing_images('d3000000-0000-0000-0000-000000000001',
  array(select id from public.listing_images where listing_id='d3000000-0000-0000-0000-000000000001' order by position));
select is((select count(*)::int from public.listing_images where listing_id='d3000000-0000-0000-0000-000000000001' and position=0), 1, 'a cover photo exists again after the old cover is removed');
set local request.jwt.claims to '{"sub":"b3000000-0000-0000-0000-000000000002","role":"authenticated"}';
select throws_ok($$select public.register_listing_image('d3000000-0000-0000-0000-000000000001','x/y.webp',10,10)$$, '42501', null, 'a non-owner cannot add photos to someone else''s listing');
set local request.jwt.claims to '{"sub":"b3000000-0000-0000-0000-000000000001","role":"authenticated"}';
select public.register_listing_image('d3000000-0000-0000-0000-000000000003','m/1.webp',1,1); select public.register_listing_image('d3000000-0000-0000-0000-000000000003','m/2.webp',1,1);
select public.register_listing_image('d3000000-0000-0000-0000-000000000003','m/3.webp',1,1); select public.register_listing_image('d3000000-0000-0000-0000-000000000003','m/4.webp',1,1);
select public.register_listing_image('d3000000-0000-0000-0000-000000000003','m/5.webp',1,1); select public.register_listing_image('d3000000-0000-0000-0000-000000000003','m/6.webp',1,1);
select public.register_listing_image('d3000000-0000-0000-0000-000000000003','m/7.webp',1,1); select public.register_listing_image('d3000000-0000-0000-0000-000000000003','m/8.webp',1,1);
select throws_ok($$select public.register_listing_image('d3000000-0000-0000-0000-000000000003','m/9.webp',1,1)$$, 'P0001', 'too_many_images', 'a ninth photo is refused');
set local request.jwt.claims to '{"sub":"b3000000-0000-0000-0000-000000000002","role":"authenticated"}';
select public.reorder_listing_images('d3000000-0000-0000-0000-000000000003', array(select id from public.listing_images where listing_id='d3000000-0000-0000-0000-000000000003' order by position desc));
reset role;
select is((select storage_path from public.listing_images where listing_id='d3000000-0000-0000-0000-000000000003' and position=0), 'm/1.webp', 'a non-owner cannot reorder photos (RLS leaves the order unchanged)');

select * from finish();
rollback;
