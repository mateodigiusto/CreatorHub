-- 0020_email_notifications.sql
-- Per-user toggle for email-out of in-app notifications. Defaults true so
-- existing users keep getting them once Resend is wired up. Settings page
-- can later expose a checkbox bound to this column.

alter table profiles
  add column email_notifications boolean not null default true;

insert into schema_migrations (version) values (20) on conflict do nothing;
