alter table public.vocabulary
  add column if not exists review_interval_days integer not null default 0
    check (review_interval_days between 0 and 3650),
  add column if not exists review_count integer not null default 0
    check (review_count >= 0),
  add column if not exists last_reviewed_at timestamptz;

create table if not exists public.document_ai_outputs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('summary', 'questions', 'vocabulary')),
  content text not null,
  provider text,
  model text,
  created_at timestamptz not null default now()
);

alter table public.document_ai_outputs enable row level security;
create policy "document_ai_outputs_own_all" on public.document_ai_outputs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.document_ai_outputs to authenticated;

create or replace function private.update_learning_progress_after_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempted_unit uuid;
  attempted_path uuid;
  completed_units integer;
  total_units integer;
  next_unit uuid;
begin
  insert into public.learning_events (
    user_id, event_type, skill, duration_seconds, score, metadata
  ) values (
    new.user_id,
    'practice_attempt',
    new.skill,
    coalesce(new.duration_seconds, 0),
    new.score,
    jsonb_build_object('attempt_id', new.id, 'question_id', new.question_id)
  );

  insert into public.user_skill_progress (
    user_id, skill, level, mastery, total_minutes, total_attempts,
    last_practiced_at, updated_at
  ) values (
    new.user_id,
    new.skill,
    'A1',
    coalesce(new.score, 0),
    greatest(0, coalesce(new.duration_seconds, 0) / 60),
    1,
    now(),
    now()
  )
  on conflict (user_id, skill) do update set
    mastery = round(
      (
        public.user_skill_progress.mastery
        * least(public.user_skill_progress.total_attempts, 9)
        + coalesce(new.score, public.user_skill_progress.mastery)
      ) / (least(public.user_skill_progress.total_attempts, 9) + 1),
      2
    ),
    total_minutes = public.user_skill_progress.total_minutes
      + greatest(0, coalesce(new.duration_seconds, 0) / 60),
    total_attempts = public.user_skill_progress.total_attempts + 1,
    last_practiced_at = now(),
    updated_at = now();

  select q.unit_id, u.path_id into attempted_unit, attempted_path
  from public.practice_questions q
  left join public.learning_units u on u.id = q.unit_id
  where q.id = new.question_id;

  if attempted_unit is not null and attempted_path is not null then
    select count(distinct q.unit_id) into completed_units
    from public.practice_attempts a
    join public.practice_questions q on q.id = a.question_id
    join public.learning_units u on u.id = q.unit_id
    where a.user_id = new.user_id
      and u.path_id = attempted_path;

    select count(*) into total_units
    from public.learning_units
    where path_id = attempted_path;

    select u.id into next_unit
    from public.learning_units u
    where u.path_id = attempted_path
      and not exists (
        select 1
        from public.practice_attempts a
        join public.practice_questions q on q.id = a.question_id
        where a.user_id = new.user_id and q.unit_id = u.id
      )
    order by u.position
    limit 1;

    update public.user_path_enrollments
    set progress_percent = case
          when total_units > 0 then round(completed_units * 100.0 / total_units, 2)
          else 0
        end,
        current_unit_id = next_unit,
        status = case when completed_units >= total_units then 'completed' else status end,
        completed_at = case when completed_units >= total_units then now() else null end
    where user_id = new.user_id and path_id = attempted_path;
  end if;

  return new;
end;
$$;

drop trigger if exists update_progress_after_practice_attempt
  on public.practice_attempts;
create trigger update_progress_after_practice_attempt
  after insert on public.practice_attempts
  for each row execute function private.update_learning_progress_after_attempt();

with target_unit as (
  select u.id
  from public.learning_units u
  join public.learning_paths p on p.id = u.path_id
  where p.slug = 'english-foundations-a1-b1'
  order by u.position
  limit 1
)
insert into public.practice_questions (
  unit_id, skill, question_type, prompt, passage, options, answer_key,
  explanation, difficulty, is_public
)
select target_unit.id, question.skill, question.question_type, question.prompt::jsonb,
  question.passage, question.options::jsonb, question.answer_key::jsonb,
  question.explanation::jsonb, question.difficulty, true
from target_unit
cross join (values
  (
    'reading',
    'multiple_choice',
    '{"vi":"Theo đoạn văn, điều gì giúp việc học từ xa hiệu quả?","en":"According to the passage, what makes remote learning effective?"}',
    'Remote learning gives students flexibility, but it also requires discipline. Learners who plan their time and actively ask questions tend to make better progress than those who only watch recorded lessons.',
    '[{"id":"a","text":"Studying for very long hours"},{"id":"b","text":"Planning time and asking questions"},{"id":"c","text":"Only watching recorded lessons"}]',
    '{"value":"b"}',
    '{"vi":"Câu thứ hai nêu trực tiếp việc lập kế hoạch và chủ động đặt câu hỏi.","en":"The second sentence directly states planning and active questioning."}',
    'A2'
  ),
  (
    'reading',
    'true_false',
    '{"vi":"Đúng hay sai: Chỉ xem bài giảng ghi sẵn thường tạo tiến bộ tốt nhất.","en":"True or false: Only watching recorded lessons usually creates the best progress."}',
    'Learners who plan their time and actively ask questions tend to make better progress than those who only watch recorded lessons.',
    '[{"id":"true","text":"True"},{"id":"false","text":"False"}]',
    '{"value":"false"}',
    '{"vi":"Đoạn văn nói nhóm chủ động tiến bộ tốt hơn nhóm chỉ xem bài ghi sẵn.","en":"The passage says active learners progress better."}',
    'A2'
  ),
  (
    'listening',
    'dictation',
    '{"vi":"Nghe và viết lại chính xác câu sau.","en":"Listen and write the sentence exactly."}',
    null,
    null,
    '{"text":"Good study habits are more important than studying for many hours without a plan."}',
    '{"vi":"Đối chiếu chính tả, từ chức năng và trật tự từ.","en":"Compare spelling, function words and word order."}',
    'A2'
  ),
  (
    'speaking',
    'speaking',
    '{"vi":"Đọc câu mẫu và ghi âm phần trả lời của bạn.","en":"Read the model sentence and record your response.","model":"Practice consistently, even when progress feels slow."}',
    null,
    null,
    '{"keywords":["practice","consistently","progress"]}',
    '{"vi":"Ưu tiên độ rõ, trọng âm từ và nhịp câu.","en":"Focus on clarity, word stress and sentence rhythm."}',
    'A2'
  ),
  (
    'writing',
    'essay',
    '{"vi":"Viết 100–140 từ: Bạn thích học trực tuyến hay trong lớp? Giải thích lựa chọn.","en":"Write 100–140 words: Do you prefer learning online or in a classroom? Explain your choice."}',
    null,
    null,
    '{"min_words":100,"max_words":140}',
    '{"vi":"Dùng câu chủ đề, lý do, ví dụ và kết luận.","en":"Use a topic sentence, reason, example and conclusion."}',
    'B1'
  ),
  (
    'vocabulary',
    'multiple_choice',
    '{"vi":"Từ nào gần nghĩa nhất với “accurate”?","en":"Which word is closest in meaning to “accurate”?"}',
    null,
    '[{"id":"a","text":"precise"},{"id":"b","text":"careless"},{"id":"c","text":"temporary"}]',
    '{"value":"a"}',
    '{"vi":"Accurate và precise đều diễn tả sự chính xác.","en":"Accurate and precise both describe correctness."}',
    'B1'
  )
) as question(
  skill, question_type, prompt, passage, options, answer_key,
  explanation, difficulty
)
where not exists (
  select 1 from public.practice_questions existing
  where existing.is_public
    and existing.skill = question.skill
    and existing.prompt = question.prompt::jsonb
);
