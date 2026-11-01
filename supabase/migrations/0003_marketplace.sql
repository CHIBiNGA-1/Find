insert into public.categories (slug, name) values
  ('textbooks','Textbooks'),('electronics','Electronics'),('furniture','Furniture'),
  ('clothing','Clothing'),('services','Services'),('other','Other')
on conflict (slug) do nothing;

create table public.saved_listings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
alter table public.saved_listings enable row level security;
create policy saved_read on public.saved_listings for select to authenticated using (user_id = (select auth.uid()));
create policy saved_insert on public.saved_listings for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.listings l where l.id = listing_id));
create policy saved_delete on public.saved_listings for delete to authenticated using (user_id = (select auth.uid()));

-- Private bucket. Uploads only under the user's own folder; reads follow listing visibility.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images','listing-images', false, 5242880, array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;
create policy listing_images_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy listing_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy listing_images_view on storage.objects for select to authenticated using (
  bucket_id = 'listing-images' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.listing_images li where li.storage_path = name)));  -- listing_images RLS applies

-- Keyset-paginated search. SECURITY INVOKER: RLS still applies to every row.
create function public.search_listings(
  uni uuid, q text default null, cat uuid default null, min_price bigint default null,
  max_price bigint default null, conds text[] default null,
  cursor_at timestamptz default null, cursor_id uuid default null, lim int default 25)
returns setof public.listings language sql stable security invoker set search_path = public, extensions as $$
  select l.* from public.listings l
  where l.university_id = uni and l.status = 'active'
    and (nullif(trim(q), '') is null
         or l.search @@ websearch_to_tsquery('simple', q)
         or word_similarity(q, l.title) > 0.4)          -- tolerates misspellings
    and (cat is null or l.category_id = cat)
    and (min_price is null or l.price_minor >= min_price)
    and (max_price is null or l.price_minor <= max_price)
    and (conds is null or l.condition = any (conds))
    and (cursor_at is null or (l.published_at, l.id) < (cursor_at, cursor_id))
  order by l.published_at desc, l.id desc
  limit least(lim, 50);
$$;
