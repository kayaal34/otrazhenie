-- =========================================================================
-- Патч 003: хранилище для галереи (Этап 3).
--
-- Создаёт публичный Storage bucket "gallery" и политики доступа:
-- читать файлы может кто угодно (галерея публичная), а загружать/удалять —
-- только администратор.
--
-- Note: RLS на storage.objects уже включён Supabase по умолчанию — таблицей
-- владеет служебная роль supabase_storage_admin, а не postgres, поэтому
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY здесь не нужен и вызовет
-- ошибку 42501 (must be owner of table objects). Создавать политики
-- через CREATE POLICY можно без прав владельца — этого достаточно.
--
-- Безопасно выполнять повторно.
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists "gallery_bucket_public_read" on storage.objects;
create policy "gallery_bucket_public_read" on storage.objects
  for select using (bucket_id = 'gallery');

drop policy if exists "gallery_bucket_admin_insert" on storage.objects;
create policy "gallery_bucket_admin_insert" on storage.objects
  for insert with check (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "gallery_bucket_admin_delete" on storage.objects;
create policy "gallery_bucket_admin_delete" on storage.objects
  for delete using (bucket_id = 'gallery' and public.is_admin());
