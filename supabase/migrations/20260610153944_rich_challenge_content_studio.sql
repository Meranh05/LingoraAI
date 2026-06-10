alter table public.learning_challenges
  add column if not exists challenge_type text not null default 'weekly'
    check (challenge_type in ('daily', 'weekly', 'boss', 'community')),
  add column if not exists difficulty text not null default 'normal'
    check (difficulty in ('easy', 'normal', 'hard', 'legendary')),
  add column if not exists token_reward integer not null default 0
    check (token_reward >= 0),
  add column if not exists badge_icon text not null default 'trophy',
  add column if not exists level_required integer not null default 1
    check (level_required > 0),
  add column if not exists metadata jsonb not null default '{}';

create index if not exists learning_challenges_active_type_idx
  on public.learning_challenges(is_published, challenge_type, starts_at, ends_at);

create or replace function private.award_completed_challenge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reward integer;
  tokens integer;
begin
  if old.completed_at is null and new.completed_at is not null then
    select points_reward, token_reward into reward, tokens
    from public.learning_challenges
    where id = new.challenge_id;

    update public.leaderboard_entries
    set weekly_points = weekly_points + coalesce(reward, 0),
        total_points = total_points + coalesce(reward, 0),
        updated_at = now()
    where user_id = new.user_id;

    if coalesce(tokens, 0) > 0 then
      insert into public.user_wallets(user_id, tokens)
      values (new.user_id, tokens)
      on conflict (user_id) do update set
        tokens = public.user_wallets.tokens + excluded.tokens,
        updated_at = now();

      insert into public.wallet_ledger(
        user_id, currency, amount, reason, reference_type, reference_id, metadata
      ) values (
        new.user_id, 'token', tokens, 'challenge_reward',
        'challenge', new.challenge_id::text,
        jsonb_build_object('completed_at', new.completed_at)
      );
    end if;
  end if;
  return new;
end;
$$;

insert into public.learning_challenges (
  slug, title, description, event_type, skill, target_value,
  points_reward, token_reward, challenge_type, difficulty, badge_icon,
  level_required, starts_at, ends_at, metadata
) values
(
  'daily-listening-sprint',
  '{"vi":"Listening Sprint","en":"Listening Sprint"}',
  '{"vi":"Hoàn thành hai lượt luyện nghe trong ngày.","en":"Complete two listening sessions today."}',
  'practice_attempt', 'listening', 2, 60, 8, 'daily', 'easy', 'headphones',
  1, date_trunc('day', now()), date_trunc('day', now()) + interval '1 day',
  '{"accent":"cyan","mascot":"listen"}'
),
(
  'weekly-word-hunter',
  '{"vi":"Thợ săn từ vựng","en":"Word Hunter"}',
  '{"vi":"Hoàn thành tám lượt luyện từ vựng.","en":"Complete eight vocabulary sessions."}',
  'practice_attempt', 'vocabulary', 8, 180, 24, 'weekly', 'normal', 'cards',
  2, date_trunc('week', now()), date_trunc('week', now()) + interval '7 days',
  '{"accent":"violet","mascot":"cards"}'
),
(
  'weekly-speaking-streak',
  '{"vi":"Chuỗi phản xạ nói","en":"Speaking Streak"}',
  '{"vi":"Hoàn thành năm lượt luyện nói.","en":"Complete five speaking sessions."}',
  'practice_attempt', 'speaking', 5, 200, 30, 'weekly', 'hard', 'microphone',
  3, date_trunc('week', now()), date_trunc('week', now()) + interval '7 days',
  '{"accent":"rose","mascot":"speak"}'
),
(
  'boss-polyglot',
  '{"vi":"Boss: Polyglot Core","en":"Boss: Polyglot Core"}',
  '{"vi":"Hoàn thành mười hai hoạt động bất kỳ trước khi cổng đóng.","en":"Complete twelve activities before the gate closes."}',
  null, null, 12, 400, 80, 'boss', 'legendary', 'crown',
  4, date_trunc('week', now()), date_trunc('week', now()) + interval '7 days',
  '{"accent":"amber","mascot":"champion"}'
)
on conflict (slug) do update set
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  points_reward = excluded.points_reward,
  token_reward = excluded.token_reward,
  is_published = true;
