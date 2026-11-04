-- pgTAP: migration 0013 (Stationery is available as a top-level category).
begin;
select plan(1);

select is(
  (select count(*)::int from public.categories where slug = 'stationery' and name = 'Stationery' and parent_id is null),
  1,
  'Stationery is present as a top-level category'
);

select * from finish();
rollback;
