-- 0014: founding universities and a broader "trending". Additive.
--
-- A student whose university is not listed can add it and becomes its first moderator. The university then starts in a
-- founding period (default 30 days) and must reach a target number of verified members (default 15, the founder
-- included). Reaching it makes the university permanent ('active'); missing it closes it ('closed'), and a closed
-- university is invisible: is_verified_member()/is_moderator() return false, so every existing RLS policy shuts.
-- Both numbers are settings, not code:  alter database postgres set app.founding_days = '30';  ... app.founding_members = '15';
--
-- Closing is evaluated lazily (evaluate_university(), called when a member loads the app and when moderators verify
-- people), so no scheduler is required. Nothing is deleted automatically: a closed university's rows stay until an operator
-- removes them (docs/operations.md).
-- Rollback: restore the 0006 versions of is_verified_member/is_moderator, drop the functions below, then drop the four
-- new columns from public.universities.

alter table public.universities
  add column status text not null default 'active' check (status in ('probation','active','closed')),
  add column founded_by uuid references public.profiles(id) on delete set null,
  add column probation_ends_at timestamptz,
  add column target_members int check (target_members > 0);
create index on public.universities (status);

create or replace function public.is_verified_member(uid uuid, uni uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.university_memberships m join public.universities u on u.id = m.university_id
    where m.user_id = uid and m.university_id = uni and m.status = 'verified' and u.status <> 'closed');
$$;
create or replace function public.is_moderator(uid uuid, uni uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.university_memberships m join public.universities u on u.id = m.university_id
    where m.user_id = uid and m.university_id = uni and m.status = 'verified' and m.role in ('moderator','admin') and u.status <> 'closed');
$$;

create function public.founding_terms() returns table (days int, members int)
language sql stable set search_path = '' as $$
  select coalesce(nullif(current_setting('app.founding_days', true), '')::int, 30),
         coalesce(nullif(current_setting('app.founding_members', true), '')::int, 15);
$$;
grant execute on function public.founding_terms() to authenticated;

create function public.found_university(p_name text, p_confirm_distinct boolean default false) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  nm text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_slug text; sim text; new_id uuid; t record;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if char_length(nm) not between 3 and 120 then raise exception 'invalid_name' using errcode = 'P0001'; end if;
  if exists (select 1 from public.universities where founded_by = uid) then raise exception 'already_founded' using errcode = 'P0001'; end if;
  if exists (select 1 from public.university_memberships m join public.universities u on u.id = m.university_id
             where m.user_id = uid and m.status = 'verified' and u.status <> 'closed') then
    raise exception 'already_member' using errcode = 'P0001'; end if;
  if exists (select 1 from public.universities where lower(name) = lower(nm)) then raise exception 'exists' using errcode = 'P0001'; end if;
  if not p_confirm_distinct then
    select u.name into sim from public.universities u
     where similarity(lower(u.name), lower(nm)) > 0.5 or word_similarity(lower(nm), lower(u.name)) > 0.75
     order by similarity(lower(u.name), lower(nm)) desc limit 1;
    if sim is not null then raise exception 'similar_exists:%', sim using errcode = 'P0001'; end if;
  end if;
  v_slug := trim(both '-' from regexp_replace(lower(nm), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then v_slug := 'university'; end if;
  if exists (select 1 from public.universities u2 where u2.slug = v_slug) then v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6); end if;
  select * into t from public.founding_terms();
  insert into public.universities (slug, name, country_code, status, founded_by, probation_ends_at, target_members)
  values (v_slug, nm, 'ZM', 'probation', uid, now() + make_interval(days => t.days), t.members) returning id into new_id;
  insert into public.university_memberships (user_id, university_id, status, role, verified_at) values (uid, new_id, 'verified', 'moderator', now());
  insert into public.moderation_actions (university_id, actor_id, action, target_type, target_id) values (new_id, uid, 'university_founded', 'university', new_id);
  return new_id;
end $$;
revoke all on function public.found_university(text, boolean) from public, anon;
grant execute on function public.found_university(text, boolean) to authenticated;

create function public.evaluate_university(p_uni uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare u public.universities; n int;
begin
  if not exists (select 1 from public.university_memberships where user_id = auth.uid() and university_id = p_uni) then
    raise exception 'not_authorized' using errcode = '42501'; end if;
  select * into u from public.universities where id = p_uni;
  if not found then return 'missing'; end if;
  if u.status = 'probation' then
    select count(*) into n from public.university_memberships where university_id = p_uni and status = 'verified';
    if n >= u.target_members then update public.universities set status = 'active' where id = p_uni; return 'active';
    elsif now() > u.probation_ends_at then update public.universities set status = 'closed' where id = p_uni; return 'closed';
    end if;
  end if;
  return u.status;
end $$;
revoke all on function public.evaluate_university(uuid) from public, anon;
grant execute on function public.evaluate_university(uuid) to authenticated;

create function public.university_progress(p_uni uuid) returns table (status text, members int, target int, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.status, (select count(*)::int from public.university_memberships m where m.university_id = u.id and m.status = 'verified'),
         u.target_members, u.probation_ends_at
  from public.universities u
  where u.id = p_uni and exists (select 1 from public.university_memberships m where m.user_id = auth.uid() and m.university_id = p_uni);
$$;
revoke all on function public.university_progress(uuid) from public, anon;
grant execute on function public.university_progress(uuid) to authenticated;

-- Trending: saves plus enquiries in the last 7 days, then newest. Always returns something while listings exist.
create or replace function public.trending_listings(uni uuid, lim int default 5) returns setof public.listings
language sql stable security definer set search_path = public as $$
  select l.* from public.listings l
  left join (select listing_id, count(*) n from public.saved_listings where created_at > now() - interval '7 days' group by listing_id) s on s.listing_id = l.id
  left join (select listing_id, count(*) n from public.conversations where listing_id is not null and created_at > now() - interval '7 days' group by listing_id) c on c.listing_id = l.id
  where l.university_id = uni and l.status = 'active' and public.is_verified_member(auth.uid(), uni)
  order by coalesce(s.n, 0) + coalesce(c.n, 0) desc, l.published_at desc
  limit least(lim, 12);
$$;
