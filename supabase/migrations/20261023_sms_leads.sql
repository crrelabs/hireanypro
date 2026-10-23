create table if not exists sms_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inquiry_id uuid references inquiries(id),
  listing_id uuid references listings(id),
  to_phone text not null,
  body text not null,
  status text not null default 'held', -- held (flag off) | queued | sent | dry_run | skipped | failed
  reason text,
  sent_at timestamptz,
  twilio_sid text
);
create index if not exists sms_queue_phone_idx on sms_queue(to_phone, sent_at);
create table if not exists sms_optout (
  phone text primary key,
  created_at timestamptz not null default now(),
  source text
);
alter table sms_queue enable row level security;
alter table sms_optout enable row level security;
grant select on sms_queue, sms_optout to anon;
grant select, insert, update, delete on sms_queue, sms_optout to authenticated, service_role;
