alter table public.profiles
  add column if not exists preferences jsonb not null default jsonb_build_object(
    'emailReminders', true,
    'dailyReminder', true,
    'weeklySummary', true,
    'autoPlayAudio', false,
    'showMascot', true,
    'compactMode', false
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_own_insert" on storage.objects;
create policy "avatars_own_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "avatars_own_update" on storage.objects;
create policy "avatars_own_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "avatars_own_delete" on storage.objects;
create policy "avatars_own_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
);
