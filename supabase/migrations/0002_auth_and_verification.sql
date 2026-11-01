-- Sign-up needs to list universities before the user has a session.
drop policy universities_read on public.universities;
create policy universities_read on public.universities for select to anon, authenticated using (true);

-- Audit trail for moderator decisions. Written only by security-definer functions.
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id uuid not null,
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index on public.moderation_actions (university_id, created_at desc);
alter table public.moderation_actions enable row level security;
create policy moderation_actions_read on public.moderation_actions for select to authenticated
  using (public.is_moderator((select auth.uid()), university_id));

-- Moderators verify, reject or suspend memberships of their own university only.
create function public.review_membership(target uuid, new_status text, note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.university_memberships;
begin
  if new_status not in ('verified','rejected','suspended') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  select * into m from public.university_memberships where id = target;
  if not found or not public.is_moderator(auth.uid(), m.university_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  update public.university_memberships
     set status = new_status,
         verified_at = case when new_status = 'verified' then now() else null end
   where id = target;
  insert into public.moderation_actions (university_id, actor_id, action, target_type, target_id, note)
  values (m.university_id, auth.uid(), 'membership_' || new_status, 'membership', target, note);
end $$;
revoke all on function public.review_membership(uuid, text, text) from public, anon;
grant execute on function public.review_membership(uuid, text, text) to authenticated;
