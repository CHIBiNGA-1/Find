-- DEVELOPMENT ONLY. Fictional institution; add real universities through an admin process.
insert into public.universities (slug, name, country_code, verification_strategy)
values ('demo-university', 'Demo University', 'ZM', 'manual_review')
on conflict (slug) do nothing;
