-- Trending = most saved in the last 7 days, within the caller's own university. One transparent signal.
-- SECURITY DEFINER only so it can count saves made by other people; it returns listings the caller could already
-- see (verified member, active), never who saved them.
create function public.trending_listings(uni uuid, lim int default 5) returns setof public.listings
language sql stable security definer set search_path = public as $$
  select l.* from public.listings l
  join (select listing_id, count(*) as saves from public.saved_listings
        where created_at > now() - interval '7 days' group by listing_id) s on s.listing_id = l.id
  where l.university_id = uni and l.status = 'active' and public.is_verified_member(auth.uid(), uni)
  order by s.saves desc, l.published_at desc
  limit least(lim, 12);
$$;
revoke all on function public.trending_listings(uuid, int) from public, anon;
grant execute on function public.trending_listings(uuid, int) to authenticated;
