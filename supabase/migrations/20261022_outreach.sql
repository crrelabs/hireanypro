create table if not exists public.email_suppression (
  id bigint generated always as identity primary key,
  email text not null unique,
  reason text,
  created_at timestamptz not null default now()
);
create table if not exists public.outreach_log (
  id bigint generated always as identity primary key,
  listing_id uuid,
  email text not null,
  sequence text not null,
  step int not null,
  resend_id text,
  status text,
  sent_at timestamptz not null default now()
);
create index if not exists outreach_log_email_idx on public.outreach_log (email, sequence, step);
alter table public.email_suppression enable row level security;
alter table public.outreach_log enable row level security;
-- service role bypasses RLS; no anon policies on purpose.
