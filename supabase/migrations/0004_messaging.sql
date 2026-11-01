-- Two-party conversations tied to a listing. Group chat is out of scope for v1.
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id), check (blocker_id <> blocked_id)
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id),
  listing_id uuid references public.listings(id) on delete set null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  check (buyer_id <> seller_id), unique (listing_id, buyer_id)
);
create index on public.conversations (buyer_id, last_message_at desc);
create index on public.conversations (seller_id, last_message_at desc);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null,                       -- idempotency key: a retry can never duplicate
  body text not null default '' check (char_length(body) <= 2000),
  image_path text,
  created_at timestamptz not null default now(),
  check (body <> '' or image_path is not null),
  unique (conversation_id, sender_id, client_id)
);
create index on public.messages (conversation_id, created_at desc);
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id),
  target_type text not null check (target_type in ('listing','message','user')),
  target_id uuid not null,
  reason text not null check (reason in ('spam','scam','prohibited','harassment','other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index on public.reports (university_id, status, created_at desc);

create function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create function public.is_participant(conv uuid, uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversations c where c.id = conv and uid in (c.buyer_id, c.seller_id));
$$;

alter table public.blocks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.reports enable row level security;

create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));
create policy conversations_read on public.conversations for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));
create policy messages_read on public.messages for select to authenticated
  using (public.is_participant(conversation_id, (select auth.uid())));
create policy messages_send on public.messages for insert to authenticated with check (
  sender_id = (select auth.uid()) and public.is_participant(conversation_id, (select auth.uid()))
  and not exists (select 1 from public.conversations c where c.id = conversation_id
                  and public.is_blocked_between(c.buyer_id, c.seller_id)));
create policy reads_own on public.conversation_reads for select to authenticated using (user_id = (select auth.uid()));
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_moderator((select auth.uid()), university_id));

-- Rate limit; threshold is configurable via `alter database ... set app.message_rate_per_minute = '30'`.
create function public.limit_message_rate() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.messages where sender_id = new.sender_id and created_at > now() - interval '1 minute')
     >= coalesce(nullif(current_setting('app.message_rate_per_minute', true), '')::int, 30) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger messages_rate before insert on public.messages for each row execute function public.limit_message_rate();

create function public.touch_conversation() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;
create trigger messages_touch after insert on public.messages for each row execute function public.touch_conversation();

create function public.start_conversation(p_listing uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare l public.listings; uid uuid := auth.uid(); cid uuid;
begin
  select * into l from public.listings where id = p_listing and status = 'active';
  if not found then raise exception 'listing_unavailable' using errcode = 'P0001'; end if;
  if l.seller_id = uid then raise exception 'own_listing' using errcode = 'P0001'; end if;
  if not public.is_verified_member(uid, l.university_id) then raise exception 'not_authorized' using errcode = '42501'; end if;
  if public.is_blocked_between(uid, l.seller_id) then raise exception 'blocked' using errcode = 'P0001'; end if;
  insert into public.conversations (university_id, listing_id, buyer_id, seller_id)
  values (l.university_id, l.id, uid, l.seller_id) on conflict (listing_id, buyer_id) do nothing;
  select id into cid from public.conversations where listing_id = l.id and buyer_id = uid;
  return cid;
end $$;

create function public.mark_read(p_conv uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_participant(p_conv, auth.uid()) then raise exception 'not_authorized' using errcode = '42501'; end if;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at) values (p_conv, auth.uid(), now())
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
end $$;

create function public.unread_counts() returns table (conversation_id uuid, unread bigint)
language sql stable security invoker set search_path = public as $$
  select m.conversation_id, count(*) from public.messages m
  left join public.conversation_reads r on r.conversation_id = m.conversation_id and r.user_id = auth.uid()
  where m.sender_id <> auth.uid() and (r.last_read_at is null or m.created_at > r.last_read_at)
  group by m.conversation_id;
$$;

-- University is derived server-side, never taken from the client.
create function public.submit_report(p_type text, p_target uuid, p_reason text, p_details text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); uni uuid;
begin
  if p_type = 'listing' then
    select university_id into uni from public.listings where id = p_target and seller_id <> uid;
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

revoke all on function public.start_conversation(uuid), public.mark_read(uuid), public.submit_report(text, uuid, text, text) from public, anon;
grant execute on function public.start_conversation(uuid), public.mark_read(uuid), public.submit_report(text, uuid, text, text) to authenticated;

-- Chat images: private; only conversation participants, uploads under conversation/user folders.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-images', 'message-images', false, 5242880, array['image/webp','image/jpeg','image/png']) on conflict (id) do nothing;
create policy message_images_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'message-images' and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (select 1 from public.conversations c where c.id::text = (storage.foldername(name))[1]
              and (select auth.uid()) in (c.buyer_id, c.seller_id)));
create policy message_images_view on storage.objects for select to authenticated using (
  bucket_id = 'message-images' and exists (select 1 from public.conversations c
    where c.id::text = (storage.foldername(name))[1] and (select auth.uid()) in (c.buyer_id, c.seller_id)));

alter publication supabase_realtime add table public.messages;  -- RLS still filters what each client receives
