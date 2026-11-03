-- Account deletion must remove exchange rows before deleting a profile.
-- exchange_records.conversation_id is ON DELETE RESTRICT, while conversations
-- cascade from participant profiles. Without this explicit cleanup, a user
-- who has participated in an exchange can be prevented from deleting their
-- account by the exchange -> conversation foreign key.
create or replace function public.delete_own_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Exchange history and its transaction-linked reviews are removed as part
  -- of the account's personal data deletion. This also releases the RESTRICT
  -- reference to conversations so participant cascades can complete.
  delete from public.exchange_records
   where seller_id = uid or buyer_id = uid;

  update public.profiles
     set display_name = 'Deleted User', avatar_path = null
   where id = uid;

  update public.university_memberships
     set status = 'suspended'
   where user_id = uid and status in ('verified', 'pending');

  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
