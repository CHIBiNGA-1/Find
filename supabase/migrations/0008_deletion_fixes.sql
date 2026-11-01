-- 1. A moderator deleting their account must not be blocked by their own audit rows.
--    The audit trail is kept; the actor becomes unknown.
alter table public.moderation_actions
  drop constraint moderation_actions_actor_id_fkey,
  alter column actor_id drop not null,
  add constraint moderation_actions_actor_id_fkey foreign key (actor_id) references public.profiles(id) on delete set null;

-- 2. Users must be able to delete their own files (account deletion removes stored photos).
create policy lf_img_delete on storage.objects for delete to authenticated
  using (bucket_id = 'lostfound-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy message_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'message-images' and (storage.foldername(name))[2] = (select auth.uid())::text);
