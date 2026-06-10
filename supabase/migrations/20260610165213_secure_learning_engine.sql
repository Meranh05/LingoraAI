alter table public.practice_questions
  drop constraint if exists practice_questions_question_type_check;
alter table public.practice_questions
  add constraint practice_questions_question_type_check
  check (
    question_type in (
      'multiple_choice', 'true_false', 'short_answer', 'essay',
      'dictation', 'speaking', 'fill_blank', 'match_meaning',
      'sentence_order'
    )
  );

alter table public.practice_attempts
  add column if not exists idempotency_key uuid,
  add column if not exists reward_eligible boolean not null default false,
  add column if not exists xp_awarded integer not null default 0,
  add column if not exists tokens_awarded integer not null default 0,
  add column if not exists challenge_id uuid references public.learning_challenges(id) on delete set null;

create unique index if not exists practice_attempts_user_idempotency_idx
  on public.practice_attempts(user_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists practice_attempts_reward_guard_idx
  on public.practice_attempts(user_id, question_id, created_at desc);
create index if not exists practice_attempts_challenge_idx
  on public.practice_attempts(challenge_id, user_id, created_at desc)
  where challenge_id is not null;

create table if not exists public.user_unit_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null references public.learning_units(id) on delete cascade,
  mastery numeric(5,2) not null default 0 check (mastery between 0 and 100),
  best_score numeric(5,2) not null default 0 check (best_score between 0 and 100),
  attempts integer not null default 0 check (attempts >= 0),
  passed_questions integer not null default 0 check (passed_questions >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);

alter table public.user_unit_progress enable row level security;
create policy "unit_progress_own_read" on public.user_unit_progress
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
grant select on public.user_unit_progress to authenticated;

create table if not exists public.challenge_question_pool (
  challenge_id uuid not null references public.learning_challenges(id) on delete cascade,
  question_id uuid not null references public.practice_questions(id) on delete cascade,
  position integer not null default 0,
  points_multiplier numeric(4,2) not null default 1 check (points_multiplier between 0.1 and 5),
  primary key (challenge_id, question_id)
);

alter table public.challenge_question_pool enable row level security;
create policy "challenge_pool_read" on public.challenge_question_pool
  for select to authenticated using (
    exists (
      select 1 from public.learning_challenges challenge
      where challenge.id = challenge_id and challenge.is_published
    ) or (select private.is_admin())
  );
grant select on public.challenge_question_pool to authenticated;

alter table public.learning_challenges
  add column if not exists max_attempts_per_day integer not null default 20
    check (max_attempts_per_day between 1 and 200),
  add column if not exists min_score integer not null default 60
    check (min_score between 0 and 100),
  add column if not exists season_code text not null
    default to_char(current_date, 'IYYY-"W"IW');

create table if not exists private.learning_reward_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_date date not null default current_date,
  rewarded_attempts integer not null default 0,
  xp_awarded integer not null default 0,
  tokens_awarded integer not null default 0,
  primary key (user_id, reward_date)
);
create index if not exists learning_reward_daily_user_date_idx
  on private.learning_reward_daily(user_id, reward_date desc);

create table if not exists private.learning_reward_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.practice_questions(id) on delete cascade,
  claim_date date not null default current_date,
  best_score numeric(5,2) not null,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id, claim_date)
);

drop trigger if exists award_wallet_after_learning_event on public.learning_events;
drop trigger if exists update_competition_after_learning_event on public.learning_events;

create or replace function private.update_learning_progress_after_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempted_unit uuid;
  attempted_path uuid;
  question_total integer;
  passed_total integer;
  unit_mastery numeric(5,2);
  completed_units integer;
  total_units integer;
  next_unit uuid;
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
      * least(public.user_skill_progress.total_attempts, 9)
      + coalesce(new.score, public.user_skill_progress.mastery)
    ) / (least(public.user_skill_progress.total_attempts, 9) + 1), 2),
    total_minutes = public.user_skill_progress.total_minutes
      + greatest(0, coalesce(new.duration_seconds, 0) / 60),
    total_attempts = public.user_skill_progress.total_attempts + 1,
    last_practiced_at = now(),
    updated_at = now();

  select q.unit_id, u.path_id into attempted_unit, attempted_path
  from public.practice_questions q
  left join public.learning_units u on u.id = q.unit_id
  where q.id = new.question_id;

  if attempted_unit is null then return new; end if;

  select count(*) into question_total
  from public.practice_questions
  where unit_id = attempted_unit and is_public;

  select count(distinct attempt.question_id) into passed_total
  from public.practice_attempts attempt
  join public.practice_questions question on question.id = attempt.question_id
  where attempt.user_id = new.user_id
    and question.unit_id = attempted_unit
    and attempt.score >= 70;

  select round(avg(best_score), 2) into unit_mastery
  from (
    select question.id, coalesce(max(attempt.score), 0) as best_score
    from public.practice_questions question
    left join public.practice_attempts attempt
      on attempt.question_id = question.id and attempt.user_id = new.user_id
    where question.unit_id = attempted_unit and question.is_public
    group by question.id
  ) scores;

  insert into public.user_unit_progress(
    user_id, unit_id, mastery, best_score, attempts, passed_questions,
    total_questions, completed_at, updated_at
  ) values (
    new.user_id, attempted_unit, coalesce(unit_mastery, 0), coalesce(new.score, 0),
    1, passed_total, question_total,
    case when question_total > 0 and passed_total >= question_total
      and coalesce(unit_mastery, 0) >= 70 then now() end,
    now()
  )
  on conflict (user_id, unit_id) do update set
    mastery = excluded.mastery,
    best_score = greatest(public.user_unit_progress.best_score, excluded.best_score),
    attempts = public.user_unit_progress.attempts + 1,
    passed_questions = excluded.passed_questions,
    total_questions = excluded.total_questions,
    completed_at = coalesce(public.user_unit_progress.completed_at, excluded.completed_at),
    updated_at = now();

  if attempted_path is not null then
    select count(*) into total_units
    from public.learning_units where path_id = attempted_path;

    select count(*) into completed_units
    from public.learning_units unit
    join public.user_unit_progress progress
      on progress.unit_id = unit.id and progress.user_id = new.user_id
    where unit.path_id = attempted_path and progress.completed_at is not null;

    select unit.id into next_unit
    from public.learning_units unit
    left join public.user_unit_progress progress
      on progress.unit_id = unit.id and progress.user_id = new.user_id
    where unit.path_id = attempted_path and progress.completed_at is null
    order by unit.position
    limit 1;

    update public.user_path_enrollments
    set progress_percent = case when total_units > 0
          then round(completed_units * 100.0 / total_units, 2) else 0 end,
        current_unit_id = next_unit,
        status = case when completed_units >= total_units then 'completed' else 'active' end,
        completed_at = case when completed_units >= total_units then now() else null end
    where user_id = new.user_id and path_id = attempted_path;
  end if;
  return new;
end;
$$;

create or replace function public.record_secure_practice_attempt(
  target_user_id uuid,
  target_question_id uuid,
  target_answer jsonb,
  target_score numeric,
  target_feedback jsonb,
  target_duration_seconds integer,
  target_idempotency_key uuid,
  target_challenge_id uuid default null
)
returns table (
  attempt_id uuid,
  reward_eligible boolean,
  xp_awarded integer,
  tokens_awarded integer,
  cooldown_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.practice_attempts%rowtype;
  question public.practice_questions%rowtype;
  challenge public.learning_challenges%rowtype;
  daily private.learning_reward_daily%rowtype;
  previous_at timestamptz;
  reward_allowed boolean := true;
  awarded_xp integer := 0;
  awarded_tokens integer := 0;
  cooldown integer := 0;
  new_attempt_id uuid;
  competition_points integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;
  if target_score < 0 or target_score > 100 then raise exception 'Invalid score'; end if;
  if target_duration_seconds < 0 or target_duration_seconds > 14400 then
    raise exception 'Invalid duration';
  end if;

  select * into existing from public.practice_attempts
  where user_id = target_user_id and idempotency_key = target_idempotency_key;
  if found then
    return query select existing.id, existing.reward_eligible,
      existing.xp_awarded, existing.tokens_awarded, 0;
    return;
  end if;

  select * into question from public.practice_questions
  where id = target_question_id and is_public;
  if not found then raise exception 'Question not available'; end if;

  if target_challenge_id is not null then
    select * into challenge from public.learning_challenges
    where id = target_challenge_id and is_published
      and now() between starts_at and ends_at;
    if not found then raise exception 'Challenge not available'; end if;
    if not exists (
      select 1 from public.challenge_participants
      where challenge_id = target_challenge_id and user_id = target_user_id
    ) then raise exception 'Join the challenge first'; end if;
    if not exists (
      select 1 from public.challenge_question_pool
      where challenge_id = target_challenge_id and question_id = target_question_id
    ) then raise exception 'Question is not in this challenge'; end if;
    if (
      select count(*) from public.practice_attempts
      where user_id = target_user_id and challenge_id = target_challenge_id
        and created_at >= date_trunc('day', now())
    ) >= challenge.max_attempts_per_day then
      reward_allowed := false;
    end if;
    if target_score < challenge.min_score then reward_allowed := false; end if;
  end if;

  select max(created_at) into previous_at
  from public.practice_attempts where user_id = target_user_id;
  if previous_at is not null and previous_at > now() - interval '8 seconds' then
    reward_allowed := false;
    cooldown := greatest(1, 8 - floor(extract(epoch from (now() - previous_at)))::integer);
  end if;
  if target_duration_seconds < 3 then reward_allowed := false; end if;

  insert into private.learning_reward_daily(user_id, reward_date)
  values (target_user_id, current_date)
  on conflict (user_id, reward_date) do nothing;
  select * into daily from private.learning_reward_daily
  where user_id = target_user_id and reward_date = current_date for update;
  if daily.rewarded_attempts >= 80 or daily.xp_awarded >= 1200 then
    reward_allowed := false;
  end if;

  if exists (
    select 1 from private.learning_reward_claims
    where user_id = target_user_id and question_id = target_question_id
      and claim_date = current_date and best_score >= target_score
  ) then reward_allowed := false; end if;

  if reward_allowed and target_score >= 40 then
    awarded_xp := least(30, greatest(5, round(target_score / 5)::integer));
    if target_score >= 70 and daily.tokens_awarded < 40 then
      awarded_tokens := case when target_score >= 90 then 3 else 2 end;
      awarded_tokens := least(awarded_tokens, 40 - daily.tokens_awarded);
    end if;
  end if;

  insert into public.practice_attempts(
    user_id, question_id, skill, answer, score, feedback, duration_seconds,
    idempotency_key, reward_eligible, xp_awarded, tokens_awarded, challenge_id
  ) values (
    target_user_id, target_question_id, question.skill, target_answer,
    target_score, coalesce(target_feedback, '{}'), target_duration_seconds,
    target_idempotency_key, reward_allowed, awarded_xp, awarded_tokens,
    target_challenge_id
  ) returning id into new_attempt_id;

  if reward_allowed then
    insert into private.learning_reward_claims(user_id, question_id, claim_date, best_score)
    values (target_user_id, target_question_id, current_date, target_score)
    on conflict (user_id, question_id, claim_date) do update
      set best_score = greatest(private.learning_reward_claims.best_score, excluded.best_score);

    update private.learning_reward_daily as reward_daily set
      rewarded_attempts = rewarded_attempts + 1,
      xp_awarded = reward_daily.xp_awarded + awarded_xp,
      tokens_awarded = reward_daily.tokens_awarded + awarded_tokens
    where user_id = target_user_id and reward_date = current_date;

    insert into public.user_wallets(user_id, xp, tokens)
    values (target_user_id, awarded_xp, awarded_tokens)
    on conflict (user_id) do update set
      xp = public.user_wallets.xp + excluded.xp,
      tokens = public.user_wallets.tokens + excluded.tokens,
      updated_at = now();

    if awarded_xp > 0 then
      insert into public.wallet_ledger(
        user_id, currency, amount, reason, reference_type, reference_id, metadata
      ) values (
        target_user_id, 'xp', awarded_xp, 'secure_practice_reward',
        'practice_attempt', new_attempt_id::text,
        jsonb_build_object('question_id', target_question_id)
      ) on conflict do nothing;
    end if;
    if awarded_tokens > 0 then
      insert into public.wallet_ledger(
        user_id, currency, amount, reason, reference_type, reference_id, metadata
      ) values (
        target_user_id, 'token', awarded_tokens, 'secure_practice_reward',
        'practice_attempt', new_attempt_id::text,
        jsonb_build_object('question_id', target_question_id)
      ) on conflict do nothing;
    end if;

    insert into public.learning_events(
      user_id, event_type, skill, duration_seconds, score, metadata
    ) values (
      target_user_id, 'practice_attempt', question.skill,
      target_duration_seconds, target_score,
      jsonb_build_object(
        'attempt_id', new_attempt_id,
        'question_id', target_question_id,
        'challenge_id', target_challenge_id,
        'reward_validated', true
      )
    );
  end if;

  if target_challenge_id is not null and reward_allowed then
    competition_points := greatest(1,
      round(target_score / 10)::integer
      + greatest(0, 10 - target_duration_seconds / 15)
      + least(5, (
          select count(*)::integer from (
            select streak_attempt.score
            from public.practice_attempts streak_attempt
            where streak_attempt.user_id = target_user_id
              and streak_attempt.challenge_id = target_challenge_id
              and streak_attempt.score >= challenge.min_score
              and streak_attempt.reward_eligible
            order by streak_attempt.created_at desc
            limit 5
          ) recent_correct
        ))
      + case when target_score = 100 then 5 else 0 end
    );
    update public.challenge_participants
    set progress = least(challenge.target_value, progress + 1),
        completed_at = case
          when progress + 1 >= challenge.target_value
            then coalesce(completed_at, now()) else completed_at end
    where challenge_id = target_challenge_id and user_id = target_user_id;

    update public.leaderboard_entries
    set weekly_points = case
          when week_start = date_trunc('week', current_date)::date
            then weekly_points + competition_points else competition_points end,
        total_points = total_points + competition_points,
        week_start = date_trunc('week', current_date)::date,
        updated_at = now()
    where user_id = target_user_id;
  end if;

  return query select new_attempt_id, reward_allowed,
    awarded_xp, awarded_tokens, cooldown;
end;
$$;

revoke all on function public.record_secure_practice_attempt(
  uuid, uuid, jsonb, numeric, jsonb, integer, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.record_secure_practice_attempt(
  uuid, uuid, jsonb, numeric, jsonb, integer, uuid, uuid
) to service_role;

revoke insert, update, delete on public.learning_events from authenticated;
revoke insert, update, delete on public.practice_attempts from authenticated;
revoke insert, update, delete on public.wallet_ledger from authenticated;
revoke insert, update, delete on public.user_wallets from authenticated;

insert into public.practice_questions(
  unit_id, skill, question_type, prompt, passage, options, answer_key,
  explanation, difficulty, is_public
)
select unit.id, seed.skill, seed.kind, seed.prompt::jsonb, seed.passage,
  seed.options::jsonb, seed.answer::jsonb, seed.explanation::jsonb,
  seed.difficulty, true
from public.learning_units unit
join public.learning_paths path on path.id = unit.path_id
cross join (values
  ('vocabulary','fill_blank','{"vi":"Điền từ còn thiếu: I ___ English every day.","en":"Fill the blank: I ___ English every day."}',null,'[]','{"value":"study"}','{"vi":"Sau chủ ngữ I dùng động từ nguyên mẫu study.","en":"Use the base verb study after I."}','A1'),
  ('vocabulary','match_meaning','{"vi":"Chọn nghĩa đúng của “reliable”.","en":"Choose the meaning of reliable."}',null,'[{"id":"a","text":"đáng tin cậy"},{"id":"b","text":"ồn ào"},{"id":"c","text":"hiếm khi"}]','{"value":"a"}','{"vi":"Reliable nghĩa là đáng tin cậy.","en":"Reliable means dependable."}','A2'),
  ('grammar','sentence_order','{"vi":"Sắp xếp thành câu đúng.","en":"Put the words in the correct order."}',null,'[{"id":"1","text":"She"},{"id":"2","text":"usually"},{"id":"3","text":"reads"},{"id":"4","text":"before bed"}]','{"text":"She usually reads before bed"}','{"vi":"Trạng từ tần suất đứng trước động từ thường.","en":"Frequency adverbs go before the main verb."}','A2'),
  ('reading','multiple_choice','{"vi":"Ý chính của câu “Small steps create lasting habits” là gì?","en":"What is the main idea of “Small steps create lasting habits”?"}','Small, consistent actions are easier to maintain and often produce stronger long-term results than occasional intense effort.','[{"id":"a","text":"Consistency builds durable progress"},{"id":"b","text":"Only difficult tasks matter"},{"id":"c","text":"Learning should be occasional"}]','{"value":"a"}','{"vi":"Đoạn văn nhấn mạnh sự đều đặn.","en":"The passage emphasizes consistency."}','A2'),
  ('listening','dictation','{"vi":"Nghe và chép lại câu về thói quen buổi sáng.","en":"Listen and write the morning-routine sentence."}',null,'[]','{"text":"I review five new words every morning before breakfast."}','{"vi":"Chú ý every morning và before breakfast.","en":"Notice every morning and before breakfast."}','A2')
) seed(skill,kind,prompt,passage,options,answer,explanation,difficulty)
where path.slug = 'english-foundations-a1-b1'
  and unit.position = case seed.skill
    when 'vocabulary' then 1 when 'grammar' then 1
    when 'reading' then 2 when 'listening' then 3 else 1 end
on conflict do nothing;

insert into public.learning_challenges(
  slug, title, description, event_type, skill, target_value, points_reward,
  token_reward, challenge_type, difficulty, badge_icon, level_required,
  starts_at, ends_at, metadata, max_attempts_per_day, min_score, season_code
)
select
  'mission-' || seed.number,
  jsonb_build_object('vi', seed.title, 'en', seed.title_en),
  jsonb_build_object('vi', seed.description, 'en', seed.description_en),
  'practice_attempt', seed.skill, seed.target, seed.xp, seed.tokens,
  seed.kind, seed.difficulty, seed.icon, seed.level,
  case when seed.kind = 'daily' then date_trunc('day', now())
       else date_trunc('week', now()) end,
  case when seed.kind = 'daily' then date_trunc('day', now()) + interval '1 day'
       else date_trunc('week', now()) + interval '7 days' end,
  jsonb_build_object('mascot', seed.mascot, 'category', seed.category),
  seed.daily_limit, seed.min_score, to_char(current_date, 'IYYY-"W"IW')
from (values
  (1,'Khởi động 3 câu','Warm-up 3','Hoàn thành 3 câu bất kỳ.','Complete 3 questions.',null,3,35,3,'daily','easy','star',1,'wave','habit',10,50),
  (2,'Từ vựng buổi sáng','Morning vocabulary','Làm 5 câu từ vựng.','Complete 5 vocabulary questions.','vocabulary',5,50,5,'daily','easy','cards',1,'cards','vocabulary',12,60),
  (3,'Đọc nhanh 5 phút','Five-minute reading','Hoàn thành 2 câu đọc.','Complete 2 reading questions.','reading',2,45,4,'daily','easy','book',1,'read','reading',10,60),
  (4,'Tai nghe sắc bén','Sharp ears','Hoàn thành 2 câu nghe.','Complete 2 listening questions.','listening',2,50,5,'daily','easy','headphones',1,'listen','listening',10,60),
  (5,'Phản xạ nói','Speaking reflex','Hoàn thành 2 lượt nói.','Complete 2 speaking attempts.','speaking',2,55,5,'daily','normal','microphone',1,'speak','speaking',10,60),
  (6,'Điền từ chính xác','Perfect blanks','Đúng 3 câu điền từ.','Solve 3 fill-in questions.','vocabulary',3,55,5,'daily','normal','star',1,'think','vocabulary',10,70),
  (7,'Chuỗi đúng 4','Four correct','Đạt 4 lượt từ 70 điểm.','Get 4 attempts above 70. ',null,4,60,6,'daily','normal','flame',1,'celebrate','accuracy',12,70),
  (8,'Ôn tập cuối ngày','Daily review','Hoàn thành 6 câu trong ngày.','Complete 6 daily questions.',null,6,70,7,'daily','normal','crown',1,'dance','habit',15,60),
  (9,'Thợ săn nghĩa từ','Meaning hunter','Làm 8 câu nghĩa từ.','Complete 8 meaning questions.','vocabulary',8,130,14,'weekly','normal','cards',2,'cards','vocabulary',25,65),
  (10,'Bậc thầy câu đúng','Sentence master','Hoàn thành 8 câu ngữ pháp.','Complete 8 grammar questions.','grammar',8,140,15,'weekly','normal','star',2,'think','grammar',25,65),
  (11,'Độc giả bền bỉ','Steady reader','Hoàn thành 10 câu đọc.','Complete 10 reading questions.','reading',10,150,16,'weekly','normal','book',2,'read','reading',30,65),
  (12,'Listening Sprint','Listening Sprint','Hoàn thành 8 câu nghe.','Complete 8 listening questions.','listening',8,150,16,'weekly','normal','headphones',2,'listen','listening',30,65),
  (13,'Speaking Streak','Speaking Streak','Hoàn thành 7 lượt nói.','Complete 7 speaking attempts.','speaking',7,165,18,'weekly','hard','microphone',2,'speak','speaking',25,70),
  (14,'Writer tuần','Weekly writer','Hoàn thành 5 bài viết.','Complete 5 writing tasks.','writing',5,170,18,'weekly','hard','book',2,'write','writing',20,70),
  (15,'Combo đa kỹ năng','Multi-skill combo','Hoàn thành 15 câu bất kỳ.','Complete 15 mixed questions.',null,15,190,20,'weekly','hard','flame',2,'fly','mixed',35,65),
  (16,'Không bỏ cuộc','Never give up','Luyện trong 5 ngày của tuần.','Practice during five days.',null,12,180,18,'weekly','hard','flame',2,'encourage','habit',30,60),
  (17,'Chính xác 90%','Ninety percent','Đạt 90 điểm ở 6 câu.','Score 90 on six questions.',null,6,210,22,'weekly','hard','trophy',3,'champion','accuracy',25,90),
  (18,'Boss Từ vựng','Vocabulary Boss','Vượt 12 câu từ vựng.','Beat 12 vocabulary questions.','vocabulary',12,300,35,'boss','legendary','crown',3,'champion','vocabulary',30,75),
  (19,'Boss Đọc hiểu','Reading Boss','Vượt 10 câu đọc hiểu.','Beat 10 reading questions.','reading',10,320,38,'boss','legendary','crown',3,'champion','reading',25,75),
  (20,'Boss Nghe hiểu','Listening Boss','Vượt 10 câu nghe.','Beat 10 listening questions.','listening',10,330,40,'boss','legendary','crown',3,'champion','listening',25,75),
  (21,'Boss Giao tiếp','Speaking Boss','Vượt 8 lượt nói.','Beat 8 speaking rounds.','speaking',8,350,42,'boss','legendary','crown',4,'champion','speaking',20,75),
  (22,'Marathon 25 câu','25-question marathon','Hoàn thành 25 câu hợp lệ.','Complete 25 valid questions.',null,25,280,30,'community','hard','trophy',3,'fly','mixed',40,65),
  (23,'Đồng đội từ vựng','Vocabulary community','Cùng luyện 15 câu từ vựng.','Practice 15 vocabulary questions.','vocabulary',15,240,25,'community','hard','cards',2,'cards','vocabulary',35,65),
  (24,'Câu chuyện cuối tuần','Weekend story','Hoàn thành 4 bài viết/nói.','Complete 4 writing or speaking tasks.','writing',4,220,24,'community','normal','book',2,'write','creative',20,65),
  (25,'Phản xạ vàng','Golden reflex','Đạt 100 điểm ở 5 câu.','Score 100 on five questions.',null,5,260,28,'community','hard','star',3,'surprise','accuracy',20,100),
  (26,'Nhà thám hiểm A2','A2 explorer','Hoàn thành 12 câu A2.','Complete 12 A2 questions.',null,12,230,24,'weekly','hard','trophy',3,'fly','level',30,70),
  (27,'Kho báu Lingora','Lingora treasure','Hoàn thành 18 câu đa dạng.','Complete 18 varied questions.',null,18,290,32,'weekly','legendary','crown',4,'treasure','mixed',35,70),
  (28,'Huyền thoại tuần','Weekly legend','Hoàn thành 30 câu hợp lệ.','Complete 30 valid questions.',null,30,400,45,'boss','legendary','crown',5,'champion','mixed',45,75)
) seed(number,title,title_en,description,description_en,skill,target,xp,tokens,kind,difficulty,icon,level,mascot,category,daily_limit,min_score)
on conflict (slug) do update set
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  season_code = excluded.season_code,
  max_attempts_per_day = excluded.max_attempts_per_day,
  min_score = excluded.min_score,
  is_published = true;

insert into public.challenge_question_pool(challenge_id, question_id, position)
select challenge.id, question.id,
  row_number() over (partition by challenge.id order by question.created_at, question.id)::integer
from public.learning_challenges challenge
join public.practice_questions question
  on question.is_public
  and (challenge.skill is null or challenge.skill = question.skill)
where challenge.is_published
on conflict (challenge_id, question_id) do nothing;
