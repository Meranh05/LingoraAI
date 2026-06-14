alter table public.practice_attempts
  add column if not exists unit_session_id uuid;

create table if not exists public.learning_unit_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null references public.learning_units(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'completed', 'failed', 'abandoned')),
  score numeric(5,2) check (score between 0 and 100),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  tokens_awarded integer not null default 0 check (tokens_awarded >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.practice_attempts
  drop constraint if exists practice_attempts_unit_session_id_fkey;
alter table public.practice_attempts
  add constraint practice_attempts_unit_session_id_fkey
  foreign key (unit_session_id)
  references public.learning_unit_sessions(id)
  on delete set null;

create index if not exists learning_unit_sessions_user_unit_idx
  on public.learning_unit_sessions(user_id, unit_id, started_at desc);
create index if not exists practice_attempts_unit_session_idx
  on public.practice_attempts(unit_session_id, question_id, created_at desc)
  where unit_session_id is not null;

alter table public.learning_unit_sessions enable row level security;
drop policy if exists "unit_sessions_own_read" on public.learning_unit_sessions;
create policy "unit_sessions_own_read" on public.learning_unit_sessions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
grant select on public.learning_unit_sessions to authenticated;

create table if not exists public.user_question_review_queue (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.practice_questions(id) on delete cascade,
  source_unit_id uuid references public.learning_units(id) on delete cascade,
  reason text not null default 'difficult'
    check (reason in ('incorrect', 'difficult', 'low_score')),
  last_score numeric(5,2) not null default 0 check (last_score between 0 and 100),
  review_count integer not null default 0 check (review_count >= 0),
  mastered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

alter table public.user_question_review_queue enable row level security;
drop policy if exists "question_review_own_read" on public.user_question_review_queue;
create policy "question_review_own_read" on public.user_question_review_queue
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
grant select on public.user_question_review_queue to authenticated;

create table if not exists private.learning_unit_reward_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null references public.learning_units(id) on delete cascade,
  session_id uuid not null references public.learning_unit_sessions(id) on delete cascade,
  xp_awarded integer not null,
  tokens_awarded integer not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, unit_id),
  unique (session_id)
);

create or replace function private.update_learning_progress_after_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  skill_mastery numeric(5,2);
begin
  insert into public.user_skill_progress (
    user_id, skill, level, mastery, total_minutes, total_attempts,
    last_practiced_at, updated_at
  ) values (
    new.user_id, new.skill, 'A1', coalesce(new.score, 0),
    greatest(0, coalesce(new.duration_seconds, 0) / 60), 1, now(), now()
  )
  on conflict (user_id, skill) do update set
    mastery = round((
      public.user_skill_progress.mastery
      * least(public.user_skill_progress.total_attempts, 14)
      + coalesce(new.score, public.user_skill_progress.mastery)
    ) / (least(public.user_skill_progress.total_attempts, 14) + 1), 2),
    total_minutes = public.user_skill_progress.total_minutes
      + greatest(0, coalesce(new.duration_seconds, 0) / 60),
    total_attempts = public.user_skill_progress.total_attempts + 1,
    last_practiced_at = now(),
    updated_at = now()
  returning mastery into skill_mastery;

  update public.user_skill_progress
  set level = case
    when skill_mastery >= 88 then 'C1'
    when skill_mastery >= 76 then 'B2'
    when skill_mastery >= 62 then 'B1'
    when skill_mastery >= 45 then 'A2'
    else 'A1'
  end
  where user_id = new.user_id and skill = new.skill;

  return new;
end;
$$;

create or replace function public.start_learning_unit_session(
  target_user_id uuid,
  target_unit_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_path_id uuid;
  target_position integer;
  previous_unit_id uuid;
  new_session_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  select path_id, position into target_path_id, target_position
  from public.learning_units
  where id = target_unit_id;
  if not found then raise exception 'Unit not found'; end if;

  if not exists (
    select 1 from public.user_path_enrollments
    where user_id = target_user_id
      and path_id = target_path_id
      and status in ('active', 'completed')
  ) then
    raise exception 'Enroll in the roadmap first';
  end if;

  select id into previous_unit_id
  from public.learning_units
  where path_id = target_path_id and position < target_position
  order by position desc
  limit 1;

  if previous_unit_id is not null and not exists (
    select 1 from public.user_unit_progress
    where user_id = target_user_id
      and unit_id = previous_unit_id
      and completed_at is not null
  ) then
    raise exception 'Previous unit is incomplete';
  end if;

  update public.learning_unit_sessions
  set status = 'abandoned', completed_at = now()
  where user_id = target_user_id
    and unit_id = target_unit_id
    and status = 'active';

  insert into public.learning_unit_sessions(user_id, unit_id)
  values (target_user_id, target_unit_id)
  returning id into new_session_id;

  return new_session_id;
end;
$$;

create or replace function public.attach_attempt_to_unit_session(
  target_user_id uuid,
  target_session_id uuid,
  target_unit_id uuid,
  target_question_id uuid,
  target_attempt_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;
  if not exists (
    select 1 from public.learning_unit_sessions
    where id = target_session_id
      and user_id = target_user_id
      and unit_id = target_unit_id
      and status = 'active'
  ) then
    raise exception 'Learning session is not active';
  end if;
  if not exists (
    select 1 from public.practice_questions
    where id = target_question_id
      and unit_id = target_unit_id
      and is_public
  ) then
    raise exception 'Question does not belong to this unit';
  end if;

  update public.practice_attempts
  set unit_session_id = target_session_id
  where id = target_attempt_id
    and user_id = target_user_id
    and question_id = target_question_id;

  if not found then raise exception 'Attempt not found'; end if;
end;
$$;

create or replace function public.set_question_review_state(
  target_user_id uuid,
  target_question_id uuid,
  target_difficult boolean,
  target_score numeric default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_unit_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;
  select unit_id into target_unit_id
  from public.practice_questions
  where id = target_question_id;
  if not found then raise exception 'Question not found'; end if;

  if target_difficult then
    insert into public.user_question_review_queue(
      user_id, question_id, source_unit_id, reason, last_score, updated_at
    ) values (
      target_user_id, target_question_id, target_unit_id, 'difficult',
      least(100, greatest(0, target_score)), now()
    )
    on conflict (user_id, question_id) do update set
      reason = 'difficult',
      last_score = excluded.last_score,
      mastered_at = null,
      updated_at = now();
  else
    delete from public.user_question_review_queue
    where user_id = target_user_id and question_id = target_question_id;
  end if;
end;
$$;

create or replace function public.finalize_learning_unit_session(
  target_user_id uuid,
  target_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.learning_unit_sessions%rowtype;
  unit_row public.learning_units%rowtype;
  question_total integer;
  answered_total integer;
  passed_total integer;
  average_score numeric(5,2);
  passed boolean;
  first_completion boolean := false;
  reward_xp integer := 0;
  reward_tokens integer := 0;
  total_units integer;
  completed_units integer;
  next_unit_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  select * into session_row
  from public.learning_unit_sessions
  where id = target_session_id and user_id = target_user_id
  for update;
  if not found then raise exception 'Learning session not found'; end if;

  if session_row.status <> 'active' then
    return jsonb_build_object(
      'passed', session_row.status = 'completed',
      'score', coalesce(session_row.score, 0),
      'correct', session_row.correct_answers,
      'total', session_row.total_questions,
      'xp', session_row.xp_awarded,
      'tokens', session_row.tokens_awarded,
      'nextUnitId', null,
      'alreadyFinalized', true
    );
  end if;

  select * into unit_row from public.learning_units where id = session_row.unit_id;

  select count(*) into question_total
  from public.practice_questions
  where unit_id = session_row.unit_id and is_public;

  select count(*), count(*) filter (where best_score >= 70),
    coalesce(round(avg(best_score), 2), 0)
  into answered_total, passed_total, average_score
  from (
    select question.id, max(attempt.score) as best_score
    from public.practice_questions question
    join public.practice_attempts attempt
      on attempt.question_id = question.id
      and attempt.user_id = target_user_id
      and attempt.unit_session_id = target_session_id
    where question.unit_id = session_row.unit_id and question.is_public
    group by question.id
  ) scores;

  if question_total = 0 then raise exception 'Unit has no published questions'; end if;
  if answered_total < question_total then
    raise exception 'Answer every question in this unit before finishing';
  end if;

  passed := average_score >= unit_row.unlock_mastery
    and passed_total >= greatest(1, ceil(question_total * 0.6)::integer);

  insert into public.user_question_review_queue(
    user_id, question_id, source_unit_id, reason, last_score, updated_at
  )
  select target_user_id, scores.question_id, session_row.unit_id,
    case when scores.best_score < 40 then 'incorrect' else 'low_score' end,
    scores.best_score, now()
  from (
    select question.id as question_id, max(attempt.score) as best_score
    from public.practice_questions question
    join public.practice_attempts attempt
      on attempt.question_id = question.id
      and attempt.user_id = target_user_id
      and attempt.unit_session_id = target_session_id
    where question.unit_id = session_row.unit_id and question.is_public
    group by question.id
  ) scores
  where scores.best_score < 70
  on conflict (user_id, question_id) do update set
    reason = excluded.reason,
    last_score = excluded.last_score,
    mastered_at = null,
    updated_at = now();

  update public.user_question_review_queue review
  set mastered_at = now(), last_score = scores.best_score,
      review_count = review.review_count + 1, updated_at = now()
  from (
    select question.id as question_id, max(attempt.score) as best_score
    from public.practice_questions question
    join public.practice_attempts attempt
      on attempt.question_id = question.id
      and attempt.user_id = target_user_id
      and attempt.unit_session_id = target_session_id
    where question.unit_id = session_row.unit_id and question.is_public
    group by question.id
  ) scores
  where review.user_id = target_user_id
    and review.question_id = scores.question_id
    and scores.best_score >= 85;

  insert into public.user_unit_progress(
    user_id, unit_id, mastery, best_score, attempts, passed_questions,
    total_questions, completed_at, updated_at
  ) values (
    target_user_id, session_row.unit_id, average_score, average_score, 1,
    passed_total, question_total, case when passed then now() end, now()
  )
  on conflict (user_id, unit_id) do update set
    mastery = excluded.mastery,
    best_score = greatest(public.user_unit_progress.best_score, excluded.best_score),
    attempts = public.user_unit_progress.attempts + 1,
    passed_questions = excluded.passed_questions,
    total_questions = excluded.total_questions,
    completed_at = case
      when passed then coalesce(public.user_unit_progress.completed_at, now())
      else public.user_unit_progress.completed_at
    end,
    updated_at = now();

  if passed then
    insert into private.learning_unit_reward_claims(
      user_id, unit_id, session_id, xp_awarded, tokens_awarded
    ) values (
      target_user_id, session_row.unit_id, target_session_id,
      40 + unit_row.position * 10,
      3 + least(7, unit_row.position)
    )
    on conflict (user_id, unit_id) do nothing;
    first_completion := found;

    if first_completion then
      reward_xp := 40 + unit_row.position * 10;
      reward_tokens := 3 + least(7, unit_row.position);
      insert into public.user_wallets(user_id, xp, tokens)
      values (target_user_id, reward_xp, reward_tokens)
      on conflict (user_id) do update set
        xp = public.user_wallets.xp + excluded.xp,
        tokens = public.user_wallets.tokens + excluded.tokens,
        updated_at = now();

      insert into public.wallet_ledger(
        user_id, currency, amount, reason, reference_type, reference_id, metadata
      ) values
        (target_user_id, 'xp', reward_xp, 'unit_completion_reward',
         'learning_unit', session_row.unit_id::text,
         jsonb_build_object('session_id', target_session_id)),
        (target_user_id, 'token', reward_tokens, 'unit_completion_reward',
         'learning_unit', session_row.unit_id::text,
         jsonb_build_object('session_id', target_session_id));
    end if;

    select id into next_unit_id
    from public.learning_units
    where path_id = unit_row.path_id and position > unit_row.position
    order by position
    limit 1;

    select count(*) into total_units
    from public.learning_units where path_id = unit_row.path_id;
    select count(*) into completed_units
    from public.learning_units target_unit
    join public.user_unit_progress progress
      on progress.unit_id = target_unit.id
      and progress.user_id = target_user_id
      and progress.completed_at is not null
    where target_unit.path_id = unit_row.path_id;

    update public.user_path_enrollments
    set progress_percent = round(completed_units * 100.0 / greatest(total_units, 1), 2),
        current_unit_id = next_unit_id,
        status = case when next_unit_id is null then 'completed' else 'active' end,
        completed_at = case when next_unit_id is null then now() else null end
    where user_id = target_user_id and path_id = unit_row.path_id;
  end if;

  update public.learning_unit_sessions
  set status = case when passed then 'completed' else 'failed' end,
      score = average_score,
      correct_answers = passed_total,
      total_questions = question_total,
      xp_awarded = reward_xp,
      tokens_awarded = reward_tokens,
      completed_at = now()
  where id = target_session_id;

  return jsonb_build_object(
    'passed', passed,
    'score', average_score,
    'correct', passed_total,
    'total', question_total,
    'xp', reward_xp,
    'tokens', reward_tokens,
    'nextUnitId', next_unit_id,
    'firstCompletion', first_completion,
    'requiredScore', unit_row.unlock_mastery
  );
end;
$$;

revoke all on function public.start_learning_unit_session(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.attach_attempt_to_unit_session(uuid, uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.set_question_review_state(uuid, uuid, boolean, numeric)
  from public, anon, authenticated;
revoke all on function public.finalize_learning_unit_session(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.start_learning_unit_session(uuid, uuid) to service_role;
grant execute on function public.attach_attempt_to_unit_session(uuid, uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.set_question_review_state(uuid, uuid, boolean, numeric) to service_role;
grant execute on function public.finalize_learning_unit_session(uuid, uuid) to service_role;
