-- Account deletion: users can permanently delete their own account.
-- Profile is anonymised first so display_name references in existing reviews
-- and moderation_actions degrade gracefully rather than cascading unexpectedly.

create function public.delete_own_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;

  -- 1. Anonymise the profile so stale display_name references read "Deleted User".
  --    The on delete cascade from auth.users → profiles will clean up the row,
  --    but moderation_actions.actor_id and reviews.reviewer_id reference profiles(id)
  --    without on delete cascade, so we leave the row and just blank the name.
  update public.profiles
     set display_name = 'Deleted User',
         avatar_path  = null
   where id = uid;

  -- 2. Suspend all active university memberships so this user's content
  --    becomes invisible via RLS before the auth row is removed.
  update public.university_memberships
     set status = 'suspended'
   where user_id = uid and status in ('verified', 'pending');

  -- 3. Hard-delete the auth user. The FK profiles(id) → auth.users(id) ON DELETE CASCADE
  --    will remove the profile row and cascade through memberships, listings,
  --    messages, conversations, saved_listings, etc.
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
