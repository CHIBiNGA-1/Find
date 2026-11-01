-- CampusHive foundation: tenancy, membership, profiles, listings. RLS on every table.
create extension if not exists pg_trgm;

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  country_code char(2) not null,
  currency_code char(3) not null default 'ZMW',
  timezone text not null default 'Africa/Lusaka',
  verification_strategy text not null default 'manual_review'
    check (verification_strategy in ('email_domain','institutional_sso','manual_review')),
  email_domains text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  avatar_path text,
  created_at timestamptz not null default now()
);

create table public.university_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','verified','rejected','suspended')),
  role text not null default 'student' check (role in ('student','moderator','admin')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, university_id)
);
create index on public.university_memberships (university_id, status);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_id uuid references public.categories(id) on delete restrict
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id),
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 4000),
  price_minor bigint not null check (price_minor >= 0),      -- integer minor units, never floats
  currency_code char(3) not null,
  condition text not null check (condition in ('new','like_new','good','fair','poor')),
  meeting_preferences text check (char_length(meeting_preferences) <= 500),
  status text not null default 'draft' check (status in ('draft','active','sold','archived','removed')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))
  ) stored
);
create index listings_feed_idx on public.listings (university_id, status, published_at desc, id);
create index listings_seller_idx on public.listings (seller_id, status);
create index listings_search_idx on public.listings using gin (search);
create index listings_title_trgm_idx on public.listings using gin (title gin_trgm_ops); -- typo-tolerant search

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  position smallint not null default 0 check (position >= 0),
  width int not null check (width > 0),
  height int not null check (height > 0),
  alt_text text check (char_length(alt_text) <= 200),
  unique (listing_id, position) deferrable initially deferred
);

-- Membership check used by policies. security definer avoids RLS recursion.
create function public.is_verified_member(uid uuid, uni uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.university_memberships m
    where m.user_id = uid and m.university_id = uni and m.status = 'verified');
$$;

create function public.is_moderator(uid uuid, uni uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.university_memberships m
    where m.user_id = uid and m.university_id = uni and m.status = 'verified' and m.role in ('moderator','admin'));
$$;

-- Server-enforced listing rules: immutable ownership/scope, valid status transitions.
create function public.enforce_listing_rules() returns trigger
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
      (old.status = 'archived' and new.status in ('active','removed'))
    ) then
      raise exception 'invalid_status_transition' using errcode = 'P0001';
    end if;
    if new.status = 'active' and old.status = 'draft' then new.published_at := now(); end if;
  elsif new.status = 'active' then
    new.published_at := now();
  end if;
  return new;
end $$;
create trigger listings_rules before insert or update on public.listings
  for each row execute function public.enforce_listing_rules();

-- Create a profile automatically for each new auth user.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Student'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.universities enable row level security;
alter table public.profiles enable row level security;
alter table public.university_memberships enable row level security;
alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

create policy universities_read on public.universities for select to authenticated using (true);
create policy categories_read on public.categories for select to authenticated using (true);

create policy profiles_read on public.profiles for select to authenticated using (
  id = (select auth.uid()) or exists (
    select 1 from public.university_memberships a
    join public.university_memberships b on a.university_id = b.university_id
    where a.user_id = (select auth.uid()) and a.status = 'verified'
      and b.user_id = profiles.id and b.status = 'verified'));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy memberships_read_own on public.university_memberships for select to authenticated
  using (user_id = (select auth.uid()));
-- Users may only request membership. Verification is a server/moderator action.
create policy memberships_request on public.university_memberships for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and role = 'student' and verified_at is null);

create policy listings_read on public.listings for select to authenticated using (
  seller_id = (select auth.uid())
  or (status in ('active','sold') and public.is_verified_member((select auth.uid()), university_id))
  or public.is_moderator((select auth.uid()), university_id));
create policy listings_insert on public.listings for insert to authenticated with check (
  seller_id = (select auth.uid()) and status in ('draft','active')
  and public.is_verified_member((select auth.uid()), university_id));
create policy listings_update_own on public.listings for update to authenticated
  using (seller_id = (select auth.uid()) and status <> 'removed')
  with check (seller_id = (select auth.uid()) and status <> 'removed'
    and public.is_verified_member((select auth.uid()), university_id));
create policy listings_update_moderator on public.listings for update to authenticated
  using (public.is_moderator((select auth.uid()), university_id))
  with check (public.is_moderator((select auth.uid()), university_id));
create policy listings_delete_draft on public.listings for delete to authenticated
  using (seller_id = (select auth.uid()) and status = 'draft');

create policy listing_images_read on public.listing_images for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));  -- inherits listings RLS
create policy listing_images_write on public.listing_images for all to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));
