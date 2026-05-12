-- v31: Per-client retainer tracking on creator_relationships.
--
-- Editors charge clients on a retainer (monthly fee for ongoing edit work).
-- The plan called for storing the amount + currency on the relationship row
-- itself rather than as a separate billing table — it's static metadata, not
-- transactional history. The Reports tab surfaces this as context; future
-- iterations can drive invoicing off it.
--
-- All fields nullable so existing rows don't break (no backfill needed).
-- ISO-4217 codes only — UI restricts the picker, DB only enforces shape via
-- the LENGTH check (avoids needing an enum we'd have to extend per-currency).

alter table public.creator_relationships
  add column if not exists retainer_amount numeric(10, 2),
  add column if not exists retainer_currency text,
  add column if not exists retainer_cadence text;

alter table public.creator_relationships
  add constraint creator_relationships_retainer_currency_check
    check (
      retainer_currency is null
      or (length(retainer_currency) = 3 and retainer_currency = upper(retainer_currency))
    );

alter table public.creator_relationships
  add constraint creator_relationships_retainer_cadence_check
    check (
      retainer_cadence is null
      or retainer_cadence in ('monthly', 'quarterly', 'project')
    );

alter table public.creator_relationships
  add constraint creator_relationships_retainer_amount_positive_check
    check (retainer_amount is null or retainer_amount > 0);

insert into schema_migrations (version) values (31) on conflict do nothing;
