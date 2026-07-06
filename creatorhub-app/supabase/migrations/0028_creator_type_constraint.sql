-- 0028_creator_type_constraint.sql
-- Lock down profiles.creator_type to the canonical set + add the two
-- new roles from the PDF expansion: content_manager and editor.
--
-- Today the column is loose `text` with no constraint — typos like
-- 'creater' or 'fittness' would silently land. Added as a NOT VALID
-- check first so existing rows aren't re-validated mid-migration; then
-- VALIDATE forces the check on legacy rows. If any row fails (would
-- only happen if there's already a typo in production), this migration
-- fails loudly — desired.

alter table profiles
  add constraint profiles_creator_type_check
  check (creator_type in (
    'creator',
    'infoproduct',
    'agency',
    'fitness',
    'realestate',
    'content_manager',
    'editor',
    'other'
  )) not valid;

alter table profiles validate constraint profiles_creator_type_check;

insert into schema_migrations (version) values (28) on conflict do nothing;
