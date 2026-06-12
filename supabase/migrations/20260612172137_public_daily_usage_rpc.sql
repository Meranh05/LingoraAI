create or replace function public.consume_daily_usage(
  target_user_id uuid,
  target_metric text,
  target_limit integer
)
returns table (
  allowed boolean,
  used integer,
  quota integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is distinct from (select auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if target_limit < 0 then
    raise exception 'Invalid quota';
  end if;

  return query
  select *
  from private.consume_daily_usage(
    target_user_id,
    target_metric,
    target_limit
  );
end;
$$;

revoke all on function private.consume_daily_usage(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.consume_daily_usage(uuid, text, integer)
  from public, anon, service_role;
grant execute on function public.consume_daily_usage(uuid, text, integer)
  to authenticated;
