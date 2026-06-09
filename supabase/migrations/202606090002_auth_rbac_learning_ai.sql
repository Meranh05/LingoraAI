alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin')),
  add column if not exists status text not null default 'active'
    check (status in ('active', 'suspended')),
  add column if not exists locale text not null default 'vi'
    check (locale in ('vi', 'en', 'ja', 'th')),
  add column if not exists learning_goal text,
  add column if not exists daily_goal_minutes integer not null default 20
    check (daily_goal_minutes between 5 and 240),
  add column if not exists ai_training_consent boolean not null default false,
  add column if not exists consent_updated_at timestamptz;

grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and status = 'active'
  );
$$;

grant execute on function private.is_admin() to authenticated;

create or replace function private.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function private.current_profile_status()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select status from public.profiles where id = (select auth.uid());
$$;

grant execute on function private.current_profile_role() to authenticated;
grant execute on function private.current_profile_status() to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check (
    (select auth.uid()) = id
    and role = (select private.current_profile_role())
    and status = (select private.current_profile_status())
  );
create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title jsonb not null,
  description jsonb not null default '{}',
  target_level text not null,
  estimated_hours integer not null default 20,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_units (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  position integer not null,
  title jsonb not null,
  description jsonb not null default '{}',
  skill text not null check (skill in ('reading', 'writing', 'listening', 'speaking', 'vocabulary', 'grammar')),
  level text not null,
  content jsonb not null default '{}',
  estimated_minutes integer not null default 15,
  created_at timestamptz not null default now(),
  unique (path_id, position)
);

create table public.user_path_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'completed', 'paused')),
  progress_percent numeric(5,2) not null default 0
    check (progress_percent between 0 and 100),
  current_unit_id uuid references public.learning_units(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, path_id)
);

create table public.practice_questions (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.learning_units(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  skill text not null check (skill in ('reading', 'writing', 'listening', 'speaking', 'vocabulary', 'grammar')),
  question_type text not null
    check (question_type in ('multiple_choice', 'true_false', 'short_answer', 'essay', 'dictation', 'speaking')),
  prompt jsonb not null,
  passage text,
  audio_url text,
  options jsonb,
  answer_key jsonb,
  explanation jsonb,
  difficulty text not null default 'B1',
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid references public.practice_questions(id) on delete set null,
  skill text not null,
  answer jsonb not null,
  score numeric(5,2) check (score between 0 and 100),
  feedback jsonb not null default '{}',
  duration_seconds integer check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create table public.learning_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  skill text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  score numeric(5,2),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.user_skill_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill text not null,
  level text not null default 'A1',
  mastery numeric(5,2) not null default 0 check (mastery between 0 and 100),
  total_minutes integer not null default 0,
  total_attempts integer not null default 0,
  last_practiced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, skill)
);

create table public.ai_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('goal', 'preference', 'strength', 'weakness', 'correction')),
  content text not null,
  confidence numeric(4,3) not null default 0.5 check (confidence between 0 and 1),
  source_message_id bigint references public.chat_messages(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id bigint references public.chat_messages(id) on delete set null,
  input_text text,
  output_text text not null,
  rating smallint not null check (rating in (-1, 1)),
  correction text,
  category text,
  consent_snapshot boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.training_candidates (
  id uuid primary key default gen_random_uuid(),
  source_feedback_id uuid unique references public.ai_feedback(id) on delete cascade,
  anonymized_input text not null,
  anonymized_output text not null,
  preferred_output text,
  language text not null default 'vi',
  quality_score numeric(4,3) not null default 0.5 check (quality_score between 0 and 1),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected', 'exported')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index learning_events_user_created_idx on public.learning_events(user_id, created_at desc);
create index practice_attempts_user_skill_idx on public.practice_attempts(user_id, skill, created_at desc);
create index ai_memories_user_category_idx on public.ai_memories(user_id, category);
create index ai_feedback_consent_idx on public.ai_feedback(consent_snapshot, created_at desc);
create index training_candidates_status_idx on public.training_candidates(review_status, created_at);

alter table public.learning_paths enable row level security;
alter table public.learning_units enable row level security;
alter table public.user_path_enrollments enable row level security;
alter table public.practice_questions enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.learning_events enable row level security;
alter table public.user_skill_progress enable row level security;
alter table public.ai_memories enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.training_candidates enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "published_paths_read" on public.learning_paths
  for select to authenticated using (is_published or (select private.is_admin()));
create policy "admin_paths_all" on public.learning_paths
  for all to authenticated using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "published_units_read" on public.learning_units
  for select to authenticated using (
    exists (
      select 1 from public.learning_paths p
      where p.id = path_id and (p.is_published or (select private.is_admin()))
    )
  );
create policy "admin_units_all" on public.learning_units
  for all to authenticated using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "enrollments_own_or_admin" on public.user_path_enrollments
  for all to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "questions_read" on public.practice_questions
  for select to authenticated
  using (is_public or owner_id = (select auth.uid()) or (select private.is_admin()));
create policy "questions_owner_insert" on public.practice_questions
  for insert to authenticated
  with check (owner_id = (select auth.uid()) or (select private.is_admin()));
create policy "questions_owner_update" on public.practice_questions
  for update to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()))
  with check (owner_id = (select auth.uid()) or (select private.is_admin()));
create policy "questions_owner_delete" on public.practice_questions
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()));

create policy "attempts_own_or_admin" on public.practice_attempts
  for all to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "events_own_or_admin" on public.learning_events
  for all to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "skill_progress_own_or_admin" on public.user_skill_progress
  for all to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "memories_own_or_admin" on public.ai_memories
  for all to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "feedback_own_or_admin" on public.ai_feedback
  for all to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "training_admin_only" on public.training_candidates
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "audit_admin_read" on public.admin_audit_logs
  for select to authenticated using ((select private.is_admin()));

create or replace function private.queue_training_candidate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  consent boolean;
begin
  select ai_training_consent into consent
  from public.profiles where id = new.user_id;

  if consent and new.rating = 1 then
    insert into public.training_candidates (
      source_feedback_id,
      anonymized_input,
      anonymized_output,
      preferred_output,
      language,
      quality_score
    ) values (
      new.id,
      regexp_replace(
        regexp_replace(
          regexp_replace(coalesce(new.input_text, ''), '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}', '[email]', 'gi'),
          '\m[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\M',
          '[uuid]',
          'gi'
        ),
        '\+?[0-9][0-9 ()-]{7,}[0-9]',
        '[phone]',
        'g'
      ),
      regexp_replace(
        regexp_replace(
          regexp_replace(new.output_text, '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}', '[email]', 'gi'),
          '\m[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\M',
          '[uuid]',
          'gi'
        ),
        '\+?[0-9][0-9 ()-]{7,}[0-9]',
        '[phone]',
        'g'
      ),
      new.correction,
      'vi',
      case when new.correction is not null then 0.85 else 0.65 end
    ) on conflict (source_feedback_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger queue_training_candidate_after_feedback
  after insert on public.ai_feedback
  for each row execute function private.queue_training_candidate();

grant select, insert, update, delete on
  public.learning_paths,
  public.learning_units,
  public.user_path_enrollments,
  public.practice_questions,
  public.practice_attempts,
  public.learning_events,
  public.user_skill_progress,
  public.ai_memories,
  public.ai_feedback,
  public.training_candidates,
  public.admin_audit_logs
to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into public.learning_paths (
  slug, title, description, target_level, estimated_hours, is_published
) values (
  'english-foundations-a1-b1',
  '{"vi":"Nền tảng tiếng Anh A1–B1","en":"English Foundations A1–B1","ja":"英語基礎 A1–B1","th":"พื้นฐานภาษาอังกฤษ A1–B1"}',
  '{"vi":"Lộ trình cân bằng từ vựng, ngữ pháp và bốn kỹ năng.","en":"A balanced vocabulary, grammar and four-skills pathway."}',
  'B1',
  48,
  true
) on conflict (slug) do nothing;

insert into public.learning_units (path_id, position, title, description, skill, level, content, estimated_minutes)
select p.id, v.position, v.title::jsonb, v.description::jsonb, v.skill, v.level, v.content::jsonb, v.minutes
from public.learning_paths p
cross join (values
  (1, '{"vi":"Chào hỏi và giới thiệu","en":"Greetings and introductions"}', '{"vi":"Tự giới thiệu rõ ràng trong 60 giây."}', 'speaking', 'A1', '{"objectives":["introduce yourself","ask basic questions"]}', 25),
  (2, '{"vi":"Thông tin chính trong đoạn văn","en":"Main ideas in a passage"}', '{"vi":"Tìm ý chính và chi tiết hỗ trợ."}', 'reading', 'A2', '{"objectives":["skim","scan","infer"]}', 30),
  (3, '{"vi":"Nghe hội thoại hàng ngày","en":"Everyday conversations"}', '{"vi":"Nghe từ khóa và ghi chép ngắn."}', 'listening', 'A2', '{"objectives":["listen for gist","dictation"]}', 30),
  (4, '{"vi":"Viết đoạn văn mạch lạc","en":"Writing a coherent paragraph"}', '{"vi":"Topic sentence, supporting ideas và kết luận."}', 'writing', 'B1', '{"objectives":["coherence","connectors"]}', 40)
) as v(position, title, description, skill, level, content, minutes)
where p.slug = 'english-foundations-a1-b1'
on conflict (path_id, position) do nothing;
