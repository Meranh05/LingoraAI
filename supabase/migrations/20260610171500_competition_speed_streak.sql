drop trigger if exists correct_competition_speed_points_after_attempt
  on public.practice_attempts;
drop function if exists private.correct_competition_speed_points();
