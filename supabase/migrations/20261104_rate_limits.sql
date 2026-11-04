-- Durable rate limiting shared across all Vercel instances (no Redis/KV needed).
-- Additive only: new table + functions. Rollback: drop function rate_limit_hit(text,int,int); drop function rate_limit_cleanup(); drop table rate_limits;
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  window_seconds int not null,
  count int not null default 0,
  primary key (key, window_seconds, window_start)
);
create index if not exists rate_limits_window_start_idx on public.rate_limits (window_start);
alter table public.rate_limits enable row level security; -- no policies: service role only

create or replace function public.rate_limit_cleanup() returns int
language sql security definer set search_path = public as $$
  with d as (delete from public.rate_limits where window_start < now() - interval '2 hours' returning 1)
  select count(*)::int from d;
$$;

-- Atomically increments the per-minute and per-hour counters for p_key and
-- returns the new counts. ~1% of calls also purge rows older than 2 hours.
create or replace function public.rate_limit_hit(p_key text, p_minute_limit int, p_hour_limit int)
returns table (minute_count int, hour_count int, limited boolean)
language plpgsql security definer set search_path = public as $$
declare m int; h int;
begin
  insert into public.rate_limits as r (key, window_start, window_seconds, count)
  values (p_key, date_trunc('minute', now()), 60, 1)
  on conflict (key, window_seconds, window_start) do update set count = r.count + 1
  returning r.count into m;
  insert into public.rate_limits as r (key, window_start, window_seconds, count)
  values (p_key, date_trunc('hour', now()), 3600, 1)
  on conflict (key, window_seconds, window_start) do update set count = r.count + 1
  returning r.count into h;
  if random() < 0.01 then perform public.rate_limit_cleanup(); end if;
  return query select m, h, (m > p_minute_limit or h > p_hour_limit);
end;
$$;
revoke all on function public.rate_limit_hit(text,int,int) from public, anon, authenticated;
revoke all on function public.rate_limit_cleanup() from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text,int,int) to service_role;
grant execute on function public.rate_limit_cleanup() to service_role;
revoke all on public.rate_limits from anon, authenticated;
