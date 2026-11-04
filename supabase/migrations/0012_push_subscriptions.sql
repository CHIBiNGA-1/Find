-- 0012: Web Push subscriptions. Additive: one new table and two functions. Nothing existing is touched.
--
-- A row is a browser's push endpoint for one user. People read and delete only their own rows. They cannot insert directly:
-- registration goes through register_push_subscription(), which also handles a shared device (the same browser endpoint
-- signing in as a different person moves the subscription to the new person, so notifications never reach the old one).
-- The server that sends pushes uses the service-role key (server-side only) to read the recipient's rows.
--
-- Rollback: drop function public.register_push_subscription(text, text, text, text); drop table public.push_subscriptions;
-- (Subscriptions are disposable: people simply switch notifications on again.)

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 2048),
  p256dh     text not null check (char_length(p256dh) between 1 and 256),
  auth       text not null check (char_length(auth) between 1 and 128),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy push_select_own on public.push_subscriptions for select using (user_id = auth.uid());
create policy push_delete_own on public.push_subscriptions for delete using (user_id = auth.uid());
-- Deliberately no insert or update policy.

create function public.register_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;           -- moves a shared device to the current person
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300));
end $$;
revoke all on function public.register_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;
