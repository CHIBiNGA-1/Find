-- 0011: additive, backward-compatible refinements. No table is dropped, no data is rewritten.
--
--  1. listings.campus_area            optional free-text pickup area (nullable; existing rows untouched)
--  2. subcategories                   child rows under the existing six top-level categories
--  3. search_listings v2              same name and leading arguments, plus `sort` (new, price_asc, price_desc, relevant),
--                                     `cursor_price` and `rank_offset`.
--                                     A parent category now also matches its children. Old callers keep working
--                                     because every new argument has a default.
--  4. peer_last_read(conv)            lets a participant see WHEN the other participant last read ("Seen")
--  5. conversation_previews()         last message per conversation, for the inbox list (RLS applies)
--  6. confirm_exchange(decline)       a declined exchange puts the listing back on sale instead of stranding it as sold
--
--  7. register_listing_image / reorder_listing_images
--                                     the server, not the browser, assigns photo positions atomically (fixes collisions and
--                                     lost covers); SECURITY INVOKER, so listing_images RLS decides who may write
--
-- Rollback: see docs/RELEASE.md. Every object here can be removed without touching production data.

-- 1 ---------------------------------------------------------------------------------------------------------------
alter table public.listings
  add column if not exists campus_area text check (char_length(campus_area) <= 120);

-- 2 ---------------------------------------------------------------------------------------------------------------
insert into public.categories (slug, name, parent_id)
select v.slug, v.name, p.id
from (values
  ('textbooks-course',  'Course textbooks',        'textbooks'),
  ('textbooks-notes',   'Notes and study guides',  'textbooks'),
  ('textbooks-novels',  'Novels and general',      'textbooks'),
  ('electronics-phones','Phones and tablets',      'electronics'),
  ('electronics-computers','Laptops and computers','electronics'),
  ('electronics-calculators','Calculators',        'electronics'),
  ('electronics-audio', 'Audio and accessories',   'electronics'),
  ('furniture-beds',    'Beds and mattresses',     'furniture'),
  ('furniture-desks',   'Desks and chairs',        'furniture'),
  ('furniture-storage', 'Storage and shelving',    'furniture'),
  ('furniture-kitchen', 'Kitchen and appliances',  'furniture'),
  ('clothing-uniforms', 'Uniforms and lab coats',  'clothing'),
  ('clothing-shoes',    'Shoes',                   'clothing'),
  ('clothing-casual',   'Casual wear',             'clothing'),
  ('services-tutoring', 'Tutoring',                'services'),
  ('services-printing', 'Printing and typing',     'services'),
  ('services-transport','Transport',               'services')
) as v(slug, name, parent)
join public.categories p on p.slug = v.parent and p.parent_id is null
on conflict (slug) do nothing;

-- 3 ---------------------------------------------------------------------------------------------------------------
-- The old nine-argument function is replaced by one with two extra defaulted arguments. Keeping both would make
-- PostgREST named-argument calls ambiguous, so the old signature is dropped; calls that omit the new arguments
-- (the previous app build) resolve to the new function unchanged.
drop function if exists public.search_listings(uuid, text, uuid, bigint, bigint, text[], timestamptz, uuid, int);

create function public.search_listings(
  uni uuid, q text default null, cat uuid default null, min_price bigint default null,
  max_price bigint default null, conds text[] default null,
  cursor_at timestamptz default null, cursor_id uuid default null, lim int default 25,
  sort text default 'new', cursor_price bigint default null, rank_offset int default 0)
returns setof public.listings language sql stable security invoker set search_path = public, extensions as $$
  select l.* from public.listings l
  where l.university_id = uni and l.status = 'active'
    and (nullif(trim(q), '') is null
         or l.search @@ websearch_to_tsquery('simple', q)
         or word_similarity(q, l.title) > 0.4)          -- tolerates misspellings
    and (cat is null or l.category_id = cat
         or l.category_id in (select c.id from public.categories c where c.parent_id = cat))
    and (min_price is null or l.price_minor >= min_price)
    and (max_price is null or l.price_minor <= max_price)
    and (conds is null or l.condition = any (conds))
    and (cursor_id is null or sort = 'relevant' or case sort
           when 'price_asc'  then (l.price_minor, l.id) > (cursor_price, cursor_id)
           when 'price_desc' then (l.price_minor, l.id) < (cursor_price, cursor_id)
           else (l.published_at, l.id) < (cursor_at, cursor_id) end)
  order by
    case when sort = 'price_asc'  then l.price_minor end asc,
    case when sort = 'price_asc'  then l.id end asc,
    case when sort = 'price_desc' then l.price_minor end desc,
    case when sort = 'price_desc' then l.id end desc,
    -- relevance = full-text rank + trigram similarity of the title; only meaningful when q is given
    case when sort = 'relevant' and nullif(trim(q), '') is not null
         then coalesce(ts_rank(l.search, websearch_to_tsquery('simple', q)), 0) + coalesce(word_similarity(q, l.title), 0) end desc,
    l.published_at desc, l.id desc
  limit greatest(1, least(lim, 50))
  offset case when sort = 'relevant' then greatest(rank_offset, 0) else 0 end;   -- relevance has no stable keyset, so it pages by offset
$$;
grant execute on function public.search_listings(uuid, text, uuid, bigint, bigint, text[], timestamptz, uuid, int, text, bigint, int) to authenticated;

-- 4 ---------------------------------------------------------------------------------------------------------------
create function public.peer_last_read(p_conv uuid) returns timestamptz
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); other uuid; t timestamptz;
begin
  select case when c.buyer_id = uid then c.seller_id else c.buyer_id end into other
    from public.conversations c where c.id = p_conv and uid in (c.buyer_id, c.seller_id);
  if other is null then raise exception 'not_authorized' using errcode = '42501'; end if;
  select r.last_read_at into t from public.conversation_reads r where r.conversation_id = p_conv and r.user_id = other;
  return t;
end $$;
revoke all on function public.peer_last_read(uuid) from public, anon;
grant execute on function public.peer_last_read(uuid) to authenticated;

-- 5 ---------------------------------------------------------------------------------------------------------------
create function public.conversation_previews()
returns table (conversation_id uuid, body text, has_image boolean, sender_id uuid, created_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select distinct on (m.conversation_id) m.conversation_id, left(m.body, 140), m.image_path is not null, m.sender_id, m.created_at
  from public.messages m
  order by m.conversation_id, m.created_at desc;
$$;
revoke all on function public.conversation_previews() from public, anon;
grant execute on function public.conversation_previews() to authenticated;

-- 6 ---------------------------------------------------------------------------------------------------------------
-- The listing trigger still forbids sold -> active for everyone, except inside confirm_exchange(decline), which
-- raises a transaction-local flag. PostgREST cannot set that flag: set_config lives in pg_catalog, which is not exposed.
create or replace function public.enforce_listing_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    if new.seller_id <> old.seller_id or new.university_id <> old.university_id then
      raise exception 'listing_scope_immutable' using errcode = 'P0001';
    end if;
    if new.status <> old.status and not (
      (old.status = 'draft'    and new.status in ('active','removed')) or
      (old.status = 'active'   and new.status in ('sold','archived','removed')) or
      (old.status = 'archived' and new.status in ('active','removed')) or
      (old.status = 'sold' and new.status = 'active'
         and coalesce(current_setting('app.relist_allowed', true), '') = '1')
    ) then
      raise exception 'invalid_status_transition' using errcode = 'P0001';
    end if;
    if new.status = 'active' and old.status = 'draft' then new.published_at := now(); end if;
  elsif new.status = 'active' then
    new.published_at := now();
  end if;
  return new;
end $$;

create or replace function public.confirm_exchange(p_ex uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.exchange_records;
begin
  update public.exchange_records
     set status = case when p_accept then 'confirmed' else 'declined' end,
         confirmed_at = case when p_accept then now() end
   where id = p_ex and buyer_id = auth.uid() and status = 'pending'
   returning * into e;
  if not found then raise exception 'not_available' using errcode = 'P0001'; end if;
  if not p_accept and e.listing_id is not null then
    perform set_config('app.relist_allowed', '1', true);
    update public.listings set status = 'active' where id = e.listing_id and status = 'sold';
    perform set_config('app.relist_allowed', '', true);
  end if;
end $$;

-- 7 ---------------------------------------------------------------------------------------------------------------
create function public.register_listing_image(p_listing uuid, p_path text, p_width int, p_height int)
returns uuid language plpgsql security invoker set search_path = public as $$
declare pos int; new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_listing::text));          -- parallel uploads queue instead of colliding
  select coalesce(max(position) + 1, 0) into pos from public.listing_images where listing_id = p_listing;
  if pos >= 8 then raise exception 'too_many_images' using errcode = 'P0001'; end if;
  insert into public.listing_images (listing_id, storage_path, width, height, position)
  values (p_listing, p_path, p_width, p_height, pos) returning id into new_id;   -- RLS: only the seller can insert
  return new_id;
end $$;

-- Accepts the complete desired order and rewrites positions 0..n-1 in a single statement (the unique constraint is deferred).
create function public.reorder_listing_images(p_listing uuid, p_ids uuid[]) returns void
language plpgsql security invoker set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext(p_listing::text));
  update public.listing_images li set position = o.ord::smallint - 1
    from unnest(p_ids) with ordinality as o(id, ord)
   where li.id = o.id and li.listing_id = p_listing;
end $$;
revoke all on function public.register_listing_image(uuid, text, int, int), public.reorder_listing_images(uuid, uuid[]) from public, anon;
grant execute on function public.register_listing_image(uuid, text, int, int), public.reorder_listing_images(uuid, uuid[]) to authenticated;
