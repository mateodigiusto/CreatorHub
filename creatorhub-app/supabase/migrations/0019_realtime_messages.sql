-- 0019_realtime_messages.sql
-- Enable Supabase Realtime broadcast of inserts on relationship_messages.
-- Subscribers (the chat panel) get postgres_changes payloads in milliseconds
-- instead of waiting on 5-second polling. RLS still applies — non-members
-- don't receive events for relationships they're not part of.
--
-- Idempotent: wrap in DO block so re-running is a no-op if the table is
-- already in the publication.

do $$
begin
  alter publication supabase_realtime add table relationship_messages;
exception when duplicate_object then
  null;
end $$;

insert into schema_migrations (version) values (19) on conflict do nothing;
