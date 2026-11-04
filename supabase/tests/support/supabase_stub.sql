-- TEST-ONLY stand-in for the parts of Supabase the migrations depend on.
-- Never apply this to a real Supabase project. It lets migrations and pgTAP run on plain PostgreSQL.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;
create table if not exists auth.users (
  id uuid primary key, email text, role text, aud text, encrypted_password text,
  raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true),
         (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid $$;
create table if not exists storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(regexp_replace(name, '/[^/]*$', ''), '/') $$;
do $$ begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if;
end $$;
grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
grant select on auth.users to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgtap with schema extensions;
create schema if not exists tests;
