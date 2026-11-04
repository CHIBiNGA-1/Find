insert into public.categories (slug, name)
values ('stationery', 'Stationery')
on conflict (slug) do nothing;
