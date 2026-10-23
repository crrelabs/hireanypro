-- Lead upsell tracking + mark internal (non-homeowner) inquiries.
alter table inquiries add column if not exists upsell_sent_at timestamptz;
alter table inquiries add column if not exists upsell_followup_sent_at timestamptz;
-- One-off data cleanup (applied 2026-10-23): Rovira PM vendor messages + Feb 28 test.
update inquiries set status = 'internal' where name like 'Carlos Rovira%';
