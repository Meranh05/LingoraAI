create extension if not exists vector with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  level text not null default 'beginner'
    check (level in ('beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_type text not null check (file_type in ('pdf', 'docx', 'txt')),
  raw_text text,
  summary_vi text,
  summary_en text,
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

create table public.document_chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index document_chunks_embedding_hnsw
  on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  title text not null default 'Cuộc trò chuyện mới',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  provider text,
  model text,
  created_at timestamptz not null default now()
);

create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  phonetic text,
  meaning_vi text not null,
  example_en text,
  example_vi text,
  level text,
  tags text[] not null default '{}',
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, word)
);

create table public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_type text not null,
  score integer not null check (score >= 0),
  total integer not null check (total > 0 and score <= total),
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.writing_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_text text not null,
  corrected_text text not null,
  feedback_vi text,
  score numeric(3,1) check (score between 0 and 10),
  created_at timestamptz not null default now()
);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

create or replace function public.match_document_chunks(
  query_embedding extensions.vector(1536),
  match_document_id uuid,
  match_count integer default 8
)
returns table (
  id bigint,
  content text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    dc.id,
    dc.content,
    1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.document_chunks dc
  where dc.document_id = match_document_id
    and dc.user_id = (select auth.uid())
    and dc.embedding is not null
  order by dc.embedding OPERATOR(extensions.<=>) query_embedding
  limit least(match_count, 20);
$$;

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.vocabulary enable row level security;
alter table public.quiz_results enable row level security;
alter table public.writing_reviews enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "documents_own_all" on public.documents
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "chunks_own_all" on public.document_chunks
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "sessions_own_all" on public.chat_sessions
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "messages_own_all" on public.chat_messages
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "vocabulary_own_all" on public.vocabulary
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "quiz_results_own_all" on public.quiz_results
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "writing_reviews_own_all" on public.writing_reviews
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "document_storage_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "document_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "document_storage_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "document_storage_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.match_document_chunks(extensions.vector, uuid, integer) to authenticated;
