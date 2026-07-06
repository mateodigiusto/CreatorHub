-- 0011_advisor_remediation.sql
-- Address findings from `mcp__supabase__get_advisors security`:
--   - Service-role-only tables shouldn't be exposed via PostgREST.
--   - SECURITY DEFINER functions shouldn't be REST-callable.
--   - Trigger function search_path should be locked.

-- ─── Revoke REST access on internal-only tables ──────────────────────
-- These tables intentionally have no policies (service-role only).
-- Revoking grants makes the advisor stop flagging them and ensures the
-- PostgREST API genuinely cannot read them, even if a misconfigured
-- policy were added later.
revoke all on table public.oauth_states from anon, authenticated;
revoke all on table public.schema_migrations from anon, authenticated;
revoke all on table public.webhook_events from anon, authenticated;

-- ─── Lock trg_touch_updated_at search_path ───────────────────────────
-- WARN 0011: function_search_path_mutable. Trigger functions should pin
-- search_path so they can't be hijacked by a malicious schema.
alter function public.trg_touch_updated_at() set search_path = pg_catalog, public;

-- ─── Block REST execution of SECURITY DEFINER functions ──────────────
-- handle_new_auth_user fires only as a trigger from auth.users; triggers
-- run with definer privileges regardless of the caller's grants, so
-- revoking EXECUTE here doesn't break the auth-mirror flow.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

-- rls_auto_enable is a Supabase-managed event trigger present in older
-- projects. We don't own the function but we own the project — revoke
-- direct REST access. Newer projects don't have it, so guard on existence
-- to keep this migration portable across fresh bootstraps. The
-- event-trigger firing path is unaffected.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

insert into schema_migrations (version) values (11) on conflict do nothing;
