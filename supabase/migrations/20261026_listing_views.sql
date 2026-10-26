-- Daily listing page views (counted by a client beacon, bots filtered), shown to owners on the dashboard
-- and on unclaimed listing pages ("N people viewed this page in the last 30 days").
create table if not exists public.listing_views (
  listing_id uuid not null references public.listings(id) on delete cascade,
  day date not null,
  views integer not null default 0,
  primary key (listing_id, day)
);
create index if not exists listing_views_day_idx on public.listing_views (day);
alter table public.listing_views enable row level security;
-- Grants (guardrail): select to anon; full to authenticated and service_role. RLS has no policies, so only service_role can read/write.
grant select on public.listing_views to anon;
grant select, insert, update, delete on public.listing_views to authenticated, service_role;

create or replace function public.increment_listing_view(p_listing uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.listing_views (listing_id, day, views)
  values (p_listing, (now() at time zone 'America/New_York')::date, 1)
  on conflict (listing_id, day) do update set views = public.listing_views.views + 1;
$$;
revoke execute on function public.increment_listing_view(uuid) from public, anon, authenticated;
grant execute on function public.increment_listing_view(uuid) to service_role;
