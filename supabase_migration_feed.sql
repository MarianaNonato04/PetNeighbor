insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "posts_leitura" on storage.objects;
create policy "posts_leitura" on storage.objects for select to anon, authenticated using (bucket_id = 'posts');

drop policy if exists "posts_envio" on storage.objects;
create policy "posts_envio" on storage.objects for insert to anon, authenticated with check (bucket_id = 'posts');

drop policy if exists "posts_remocao" on storage.objects;
create policy "posts_remocao" on storage.objects for delete to anon, authenticated using (bucket_id = 'posts');

alter table public.pets add column if not exists especie text;
