create table public.requests (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id),
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  budget_minor bigint check (budget_minor >= 0),
  currency_code char(3) not null,
  expires_at timestamptz not null,
  status text not null default 'open' check (status in ('open','fulfilled','closed')),
  created_at timestamptz not null default now()
);
create index on public.requests (university_id, status, expires_at);

create table public.lost_found_reports (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('lost','found')),
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  area text not null check (char_length(area) between 2 and 120),   -- campus area, never a home address
  occurred_on date not null,
  image_path text,
  status text not null default 'open' check (status in ('open','resolved','removed')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.lost_found_reports (university_id, status, created_at desc);

create function public.enforce_campus_rules() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'requests' then
    if new.author_id <> old.author_id or new.university_id <> old.university_id or new.expires_at <> old.expires_at then
      raise exception 'scope_immutable' using errcode = 'P0001'; end if;
    if new.status <> old.status and old.status <> 'open' then raise exception 'invalid_status_transition' using errcode = 'P0001'; end if;
  else
    if new.reporter_id <> old.reporter_id or new.university_id <> old.university_id then
      raise exception 'scope_immutable' using errcode = 'P0001'; end if;
    if new.status <> old.status and not (old.status = 'open' and new.status in ('resolved','removed')) then
      raise exception 'invalid_status_transition' using errcode = 'P0001'; end if;
    if new.status = 'resolved' and old.status = 'open' then new.resolved_at := now(); end if;
  end if;
  return new;
end $$;
create trigger requests_rules before update on public.requests for each row execute function public.enforce_campus_rules();
create trigger lost_found_rules before update on public.lost_found_reports for each row execute function public.enforce_campus_rules();

alter table public.requests enable row level security;
alter table public.lost_found_reports enable row level security;

create policy requests_read on public.requests for select to authenticated using (
  author_id = (select auth.uid())
  or (status = 'open' and expires_at > now() and public.is_verified_member((select auth.uid()), university_id))   -- expired never shows as active
  or public.is_moderator((select auth.uid()), university_id));
create policy requests_insert on public.requests for insert to authenticated with check (
  author_id = (select auth.uid()) and status = 'open' and expires_at > now() and expires_at <= now() + interval '60 days'
  and public.is_verified_member((select auth.uid()), university_id));
create policy requests_update on public.requests for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy requests_delete on public.requests for delete to authenticated using (author_id = (select auth.uid()));

create policy lf_read on public.lost_found_reports for select to authenticated using (
  reporter_id = (select auth.uid())
  or (status in ('open','resolved') and public.is_verified_member((select auth.uid()), university_id))
  or public.is_moderator((select auth.uid()), university_id));
create policy lf_insert on public.lost_found_reports for insert to authenticated with check (
  reporter_id = (select auth.uid()) and status = 'open' and public.is_verified_member((select auth.uid()), university_id));
create policy lf_update on public.lost_found_reports for update to authenticated
  using (reporter_id = (select auth.uid()) and status <> 'removed') with check (reporter_id = (select auth.uid()) and status <> 'removed');
create policy lf_moderate on public.lost_found_reports for update to authenticated
  using (public.is_moderator((select auth.uid()), university_id)) with check (public.is_moderator((select auth.uid()), university_id));
create policy requests_moderate on public.requests for update to authenticated
  using (public.is_moderator((select auth.uid()), university_id)) with check (public.is_moderator((select auth.uid()), university_id));

-- Requests and lost-and-found reuse the existing messaging system.
alter table public.conversations
  add column request_id uuid references public.requests(id) on delete set null,
  add column lost_found_id uuid references public.lost_found_reports(id) on delete set null,
  add constraint conversations_one_topic check (num_nonnulls(listing_id, request_id, lost_found_id) <= 1),
  add constraint conversations_request_unique unique (request_id, buyer_id),
  add constraint conversations_lf_unique unique (lost_found_id, buyer_id);

create function public.start_topic_conversation(p_kind text, p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); uni uuid; owner uuid; cid uuid;
begin
  if p_kind = 'request' then
    select university_id, author_id into uni, owner from public.requests where id = p_id and status = 'open' and expires_at > now();
  elsif p_kind = 'lost_found' then
    select university_id, reporter_id into uni, owner from public.lost_found_reports where id = p_id and status = 'open';
  end if;
  if uni is null then raise exception 'unavailable' using errcode = 'P0001'; end if;
  if owner = uid then raise exception 'own_item' using errcode = 'P0001'; end if;
  if not public.is_verified_member(uid, uni) then raise exception 'not_authorized' using errcode = '42501'; end if;
  if public.is_blocked_between(uid, owner) then raise exception 'blocked' using errcode = 'P0001'; end if;
  if p_kind = 'request' then
    insert into public.conversations (university_id, request_id, buyer_id, seller_id) values (uni, p_id, uid, owner)
      on conflict (request_id, buyer_id) do nothing;
    select id into cid from public.conversations where request_id = p_id and buyer_id = uid;
  else
    insert into public.conversations (university_id, lost_found_id, buyer_id, seller_id) values (uni, p_id, uid, owner)
      on conflict (lost_found_id, buyer_id) do nothing;
    select id into cid from public.conversations where lost_found_id = p_id and buyer_id = uid;
  end if;
  return cid;
end $$;
revoke all on function public.start_topic_conversation(text, uuid) from public, anon;
grant execute on function public.start_topic_conversation(text, uuid) to authenticated;

-- Reports now cover requests and lost-and-found entries too.
alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check check (target_type in ('listing','message','user','request','lost_found'));
create or replace function public.submit_report(p_type text, p_target uuid, p_reason text, p_details text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); uni uuid;
begin
  if p_type = 'listing' then select university_id into uni from public.listings where id = p_target and seller_id <> uid;
  elsif p_type = 'request' then select university_id into uni from public.requests where id = p_target and author_id <> uid;
  elsif p_type = 'lost_found' then select university_id into uni from public.lost_found_reports where id = p_target and reporter_id <> uid;
  elsif p_type = 'message' then
    select c.university_id into uni from public.messages m join public.conversations c on c.id = m.conversation_id
      where m.id = p_target and uid in (c.buyer_id, c.seller_id) and m.sender_id <> uid;
  elsif p_type = 'user' then
    select a.university_id into uni from public.university_memberships a
      join public.university_memberships b on a.university_id = b.university_id
      where a.user_id = uid and a.status = 'verified' and b.user_id = p_target and b.status = 'verified' and p_target <> uid limit 1;
  end if;
  if uni is null or not public.is_verified_member(uid, uni) then raise exception 'not_authorized' using errcode = '42501'; end if;
  insert into public.reports (reporter_id, university_id, target_type, target_id, reason, details)
  values (uid, uni, p_type, p_target, p_reason, nullif(trim(p_details), '')) on conflict do nothing;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lostfound-images', 'lostfound-images', false, 5242880, array['image/webp','image/jpeg','image/png']) on conflict (id) do nothing;
create policy lf_img_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'lostfound-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy lf_img_view on storage.objects for select to authenticated using (
  bucket_id = 'lostfound-images' and ((storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.lost_found_reports r where r.image_path = name)));   -- follows report visibility
