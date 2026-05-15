-- 0032_drop_relationships.sql
-- Tear down the single-tenant relationship-based Clients module so it can be
-- replaced by the multi-tenant agency model in 0033.
--
-- See docs/plans/agency-clients-module.md for the full rebuild plan.

drop table if exists public.relationship_messages cascade;
drop table if exists public.relationship_documents cascade;
drop table if exists public.relationship_links cascade;
drop table if exists public.relationship_task_completions cascade;
drop table if exists public.relationship_tasks cascade;
drop table if exists public.creator_relationships cascade;
drop table if exists public.notifications cascade;

drop function if exists public.is_relationship_member(uuid);

drop type if exists public.relationship_status_t;
drop type if exists public.task_recurrence_t;
drop type if exists public.task_status_t;
drop type if exists public.notification_kind_t;

insert into schema_migrations (version) values (32) on conflict do nothing;
