-- Photo wall, part 3 of 3: the Storage bucket and who may write to it.
--
-- The Supabase connector used to apply migrations holds back any statement that deletes
-- rows until a person confirms it, so the work below was applied in parts, each under the
-- version in its file name. The functions that delete rows are in a41_delete_functions.

-- ---------------------------------------------------------------------------
-- Storage: the bucket and who may write to it
-- ---------------------------------------------------------------------------

-- Public, so the wall and the album can show the files by URL. The paths are
-- random and only the guest who took a photo, the team and the wall (once it is
-- approved) ever learn them; there is no policy that lets anon list the bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('a41_photos', 'a41_photos', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Upload: only to a path with an open ticket. Nobody can overwrite (no update policy).
create policy a41_photos_upload_with_ticket on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'a41_photos' and (select a41_private.has_photo_ticket(name)));

-- Owners delete the files of their own event. Storage reads a row back to
-- delete it, so deleting needs the select policy too.
create policy a41_photos_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'a41_photos' and (select a41_private.owns_photo_object(name)));
create policy a41_photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'a41_photos' and (select a41_private.owns_photo_object(name)));

-- A guest takes their own photo down (a41_remove_my_photo marks it removed first);
-- afterwards the file can be deleted by whoever holds its path, which is that guest.
create policy a41_photos_removed_select on storage.objects for select to anon, authenticated
  using (bucket_id = 'a41_photos' and (select a41_private.is_removed_photo_object(name)));
create policy a41_photos_removed_delete on storage.objects for delete to anon, authenticated
  using (bucket_id = 'a41_photos' and (select a41_private.is_removed_photo_object(name)));
