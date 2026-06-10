alter table public.profiles
  add column if not exists leaderboard_opt_in boolean not null default false;

create table public.leaderboard_entries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  weekly_points integer not null default 0 check (weekly_points >= 0),
  total_points integer not null default 0 check (total_points >= 0),
  week_start date not null default date_trunc('week', current_date)::date,
  updated_at timestamptz not null default now()
);

create table public.learning_challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title jsonb not null,
  description jsonb not null default '{}',
  event_type text,
  skill text,
  target_value integer not null check (target_value > 0),
  points_reward integer not null default 100 check (points_reward >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.challenge_participants (
  challenge_id uuid not null references public.learning_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

alter table public.leaderboard_entries enable row level security;
alter table public.learning_challenges enable row level security;
alter table public.challenge_participants enable row level security;

create policy "leaderboard_authenticated_read"
  on public.leaderboard_entries for select to authenticated using (true);
create policy "published_challenges_read"
  on public.learning_challenges for select to authenticated
  using (is_published or (select private.is_admin()));
create policy "challenge_participants_own_read"
  on public.challenge_participants for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "challenge_participants_own_insert"
  on public.challenge_participants for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "challenge_participants_own_delete"
  on public.challenge_participants for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.leaderboard_entries to authenticated;
grant select on public.learning_challenges to authenticated;
grant select, insert, delete on public.challenge_participants to authenticated;

create or replace function private.update_competition_after_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  awarded integer;
begin
  awarded := greatest(
    1,
    coalesce(new.duration_seconds, 0) / 60
      + coalesce(round(new.score / 10), 0)::integer
  );

  update public.leaderboard_entries
  set weekly_points = case
        when week_start = date_trunc('week', current_date)::date
          then weekly_points + awarded
        else awarded
      end,
      total_points = total_points + awarded,
      week_start = date_trunc('week', current_date)::date,
      updated_at = now()
  where user_id = new.user_id;

  update public.challenge_participants participant
  set progress = least(
        challenge.target_value,
        participant.progress + case
          when challenge.event_type is null
            or challenge.event_type = new.event_type then 1
          else 0
        end
      ),
      completed_at = case
        when participant.progress + 1 >= challenge.target_value
          and (
            challenge.event_type is null
            or challenge.event_type = new.event_type
          )
        then coalesce(participant.completed_at, now())
        else participant.completed_at
      end
  from public.learning_challenges challenge
  where participant.challenge_id = challenge.id
    and participant.user_id = new.user_id
    and challenge.is_published
    and now() between challenge.starts_at and challenge.ends_at
    and (challenge.skill is null or challenge.skill = new.skill)
    and (challenge.event_type is null or challenge.event_type = new.event_type);

  return new;
end;
$$;

drop trigger if exists update_competition_after_learning_event
  on public.learning_events;
create trigger update_competition_after_learning_event
  after insert on public.learning_events
  for each row execute function private.update_competition_after_event();

create or replace function private.award_completed_challenge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reward integer;
begin
  if old.completed_at is null and new.completed_at is not null then
    select points_reward into reward
    from public.learning_challenges
    where id = new.challenge_id;

    update public.leaderboard_entries
    set weekly_points = weekly_points + coalesce(reward, 0),
        total_points = total_points + coalesce(reward, 0),
        updated_at = now()
    where user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger award_points_after_challenge
  after update of completed_at on public.challenge_participants
  for each row execute function private.award_completed_challenge();

insert into public.learning_challenges (
  slug, title, description, event_type, target_value, points_reward,
  starts_at, ends_at
) values
(
  'weekly-practice-5',
  '{"vi":"5 phiên luyện trong tuần","en":"5 practice sessions this week"}',
  '{"vi":"Hoàn thành năm lượt luyện kỹ năng bất kỳ.","en":"Complete five skill practice attempts."}',
  'practice_attempt',
  5,
  120,
  date_trunc('week', now()),
  date_trunc('week', now()) + interval '7 days'
),
(
  'weekly-writing-3',
  '{"vi":"Thử thách viết 3 bài","en":"Write 3 pieces"}',
  '{"vi":"Gửi ba bài viết để Lingora AI sửa.","en":"Submit three pieces for AI review."}',
  'writing_review',
  3,
  150,
  date_trunc('week', now()),
  date_trunc('week', now()) + interval '7 days'
)
on conflict (slug) do update set
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  is_published = true;
