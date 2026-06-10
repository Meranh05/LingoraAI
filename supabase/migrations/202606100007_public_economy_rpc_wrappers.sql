create or replace function public.spend_tokens_for_unlock(
  target_user_id uuid,
  target_catalog_code text
)
returns table (
  feature_code text,
  expires_at timestamptz,
  tokens_remaining integer
)
language sql
security definer
set search_path = ''
as $$
  select *
  from private.spend_tokens_for_unlock(target_user_id, target_catalog_code);
$$;

revoke all on function public.spend_tokens_for_unlock(uuid, text)
  from public, anon, service_role;
grant execute on function public.spend_tokens_for_unlock(uuid, text)
  to authenticated;

create or replace function public.credit_wallet_purchase(
  target_user_id uuid,
  token_amount integer,
  checkout_session_id text,
  package_code text
)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.credit_wallet_purchase(
    target_user_id,
    token_amount,
    checkout_session_id,
    package_code
  );
$$;

revoke all on function public.credit_wallet_purchase(uuid, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.credit_wallet_purchase(uuid, integer, text, text)
  to service_role;
