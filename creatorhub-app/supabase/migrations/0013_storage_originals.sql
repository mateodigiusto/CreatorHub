-- 0013_storage_originals.sql
-- Private bucket holding raw uploaded files. Cloudflare Stream pulls
-- video originals via signed URLs; photos serve via signed URLs too.
-- Path convention: `originals/{user_id}/{asset_id}/<filename>`.

insert into storage.buckets (id, name, public)
values ('originals', 'originals', false)
on conflict (id) do nothing;

-- Users can read their own folder only. The first path segment is the
-- user_id; storage.foldername() splits the object name on '/'.
drop policy if exists originals_self_read on storage.objects;
create policy originals_self_read on storage.objects
  for select using (
    bucket_id = 'originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists originals_self_insert on storage.objects;
create policy originals_self_insert on storage.objects
  for insert with check (
    bucket_id = 'originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists originals_self_update on storage.objects;
create policy originals_self_update on storage.objects
  for update using (
    bucket_id = 'originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists originals_self_delete on storage.objects;
create policy originals_self_delete on storage.objects
  for delete using (
    bucket_id = 'originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

insert into schema_migrations (version) values (13) on conflict do nothing;
