-- An exchange is the only thing that makes a review possible: seller records it, buyer confirms it.
create table public.exchange_records (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id),
  listing_id uuid references public.listings(id) on delete set null,
  conversation_id uuid not null unique references public.conversations(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','confirmed','declined')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  check (seller_id <> buyer_id)
);
create unique index exchange_one_active_per_listing on public.exchange_records (listing_id) where status in ('pending','confirmed');

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  exchange_id uuid not null references public.exchange_records(id) on delete cascade,
  university_id uuid not null references public.universities(id),
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now(),
  unique (exchange_id, reviewer_id),           -- one review per reviewer per transaction
  check (reviewer_id <> reviewee_id)
);
create index on public.reviews (reviewee_id, status);

alter table public.exchange_records enable row level security;
alter table public.reviews enable row level security;
create policy exchanges_read on public.exchange_records for select to authenticated
  using ((select auth.uid()) in (seller_id, buyer_id) or public.is_moderator((select auth.uid()), university_id));
create policy reviews_read on public.reviews for select to authenticated using (
  reviewer_id = (select auth.uid()) or reviewee_id = (select auth.uid())
  or (status = 'published' and public.is_verified_member((select auth.uid()), university_id))
  or public.is_moderator((select auth.uid()), university_id));
-- No client write policies: all writes go through the functions below.

create function public.record_exchange(p_listing uuid, p_conv uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); l public.listings; c public.conversations; eid uuid;
begin
  select * into l from public.listings where id = p_listing and seller_id = uid and status = 'active';
  if not found then raise exception 'listing_unavailable' using errcode = 'P0001'; end if;
  select * into c from public.conversations where id = p_conv and listing_id = p_listing and seller_id = uid;
  if not found then raise exception 'invalid_conversation' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.messages where conversation_id = p_conv and sender_id = c.buyer_id) then
    raise exception 'no_enquiry' using errcode = 'P0001'; end if;
  update public.listings set status = 'sold' where id = p_listing;
  insert into public.exchange_records (university_id, listing_id, conversation_id, seller_id, buyer_id)
  values (l.university_id, l.id, c.id, uid, c.buyer_id) returning id into eid;
  return eid;
end $$;

create function public.confirm_exchange(p_ex uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.exchange_records
     set status = case when p_accept then 'confirmed' else 'declined' end,
         confirmed_at = case when p_accept then now() end
   where id = p_ex and buyer_id = auth.uid() and status = 'pending';
  if not found then raise exception 'not_available' using errcode = 'P0001'; end if;
end $$;

create function public.submit_review(p_ex uuid, p_rating int, p_comment text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e public.exchange_records;
begin
  select * into e from public.exchange_records where id = p_ex and status = 'confirmed' and uid in (seller_id, buyer_id);
  if not found then raise exception 'not_eligible' using errcode = 'P0001'; end if;
  insert into public.reviews (exchange_id, university_id, reviewer_id, reviewee_id, rating, comment)
  values (e.id, e.university_id, uid, case when uid = e.seller_id then e.buyer_id else e.seller_id end, p_rating, nullif(trim(p_comment), ''));
exception when unique_violation then raise exception 'already_reviewed' using errcode = 'P0001';
end $$;

create function public.reputation(p_user uuid) returns table (review_count bigint, avg_rating numeric)
language sql stable security invoker set search_path = public as $$
  select count(*), round(avg(rating), 1) from public.reviews where reviewee_id = p_user and status = 'published';
$$;

-- Reports: reviews can be disputed; message reports keep an excerpt so moderators never browse private chats.
alter table public.reports add column snapshot text;
alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check check (target_type in ('listing','message','user','request','lost_found','review'));
create or replace function public.submit_report(p_type text, p_target uuid, p_reason text, p_details text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); uni uuid; snap text;
begin
  if p_type = 'listing' then select university_id into uni from public.listings where id = p_target and seller_id <> uid;
  elsif p_type = 'request' then select university_id into uni from public.requests where id = p_target and author_id <> uid;
  elsif p_type = 'lost_found' then select university_id into uni from public.lost_found_reports where id = p_target and reporter_id <> uid;
  elsif p_type = 'review' then select university_id into uni from public.reviews where id = p_target and reviewee_id = uid;
  elsif p_type = 'message' then
    select c.university_id, left(m.body, 500) into uni, snap from public.messages m join public.conversations c on c.id = m.conversation_id
      where m.id = p_target and uid in (c.buyer_id, c.seller_id) and m.sender_id <> uid;
  elsif p_type = 'user' then
    select a.university_id into uni from public.university_memberships a
      join public.university_memberships b on a.university_id = b.university_id
      where a.user_id = uid and a.status = 'verified' and b.user_id = p_target and b.status = 'verified' and p_target <> uid limit 1;
  end if;
  if uni is null or not public.is_verified_member(uid, uni) then raise exception 'not_authorized' using errcode = '42501'; end if;
  insert into public.reports (reporter_id, university_id, target_type, target_id, reason, details, snapshot)
  values (uid, uni, p_type, p_target, p_reason, nullif(trim(p_details), ''), snap) on conflict do nothing;
end $$;

-- Moderator decisions: scoped to their university, audited.
create function public.moderate_report(p_report uuid, p_action text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.reports;
begin
  if p_action not in ('dismiss','remove_content','suspend_user') then raise exception 'invalid_action' using errcode = 'P0001'; end if;
  select * into r from public.reports where id = p_report;
  if not found or not public.is_moderator(auth.uid(), r.university_id) then raise exception 'not_authorized' using errcode = '42501'; end if;
  if p_action = 'remove_content' then
    if r.target_type = 'listing' then update public.listings set status = 'removed' where id = r.target_id;
    elsif r.target_type = 'request' then update public.requests set status = 'closed' where id = r.target_id and status = 'open';
    elsif r.target_type = 'lost_found' then update public.lost_found_reports set status = 'removed' where id = r.target_id and status = 'open';
    elsif r.target_type = 'review' then update public.reviews set status = 'hidden' where id = r.target_id;
    else raise exception 'not_removable' using errcode = 'P0001'; end if;
  elsif p_action = 'suspend_user' then
    if r.target_type <> 'user' then raise exception 'not_removable' using errcode = 'P0001'; end if;
    update public.university_memberships set status = 'suspended', verified_at = null
      where user_id = r.target_id and university_id = r.university_id and role = 'student';
  end if;
  update public.reports set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end where id = p_report;
  insert into public.moderation_actions (university_id, actor_id, action, target_type, target_id, note)
  values (r.university_id, auth.uid(), 'report_' || p_action, r.target_type, r.target_id, p_note);
end $$;

create function public.pending_memberships() returns table (id uuid, display_name text, university_name text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.id, p.display_name, u.name, m.created_at from public.university_memberships m
  join public.profiles p on p.id = m.user_id join public.universities u on u.id = m.university_id
  where m.status = 'pending' and public.is_moderator(auth.uid(), m.university_id) order by m.created_at;
$$;

revoke all on function public.record_exchange(uuid, uuid), public.confirm_exchange(uuid, boolean), public.submit_review(uuid, int, text),
  public.moderate_report(uuid, text, text), public.pending_memberships() from public, anon;
grant execute on function public.record_exchange(uuid, uuid), public.confirm_exchange(uuid, boolean), public.submit_review(uuid, int, text),
  public.moderate_report(uuid, text, text), public.pending_memberships() to authenticated;
