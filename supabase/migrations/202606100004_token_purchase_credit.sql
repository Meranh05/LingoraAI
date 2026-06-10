create or replace function public.credit_wallet_purchase(
  target_user_id uuid,
  token_amount integer,
  checkout_session_id text,
  package_code text
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
  if token_amount <= 0 then raise exception 'Invalid token amount'; end if;

  insert into public.wallet_ledger(
    user_id, currency, amount, reason, reference_type, reference_id, metadata
  ) values (
    target_user_id, 'token', token_amount, 'stripe_token_purchase',
    'stripe_checkout', checkout_session_id,
    jsonb_build_object('package_code', package_code)
  )
  on conflict do nothing;

  if found then
    insert into public.user_wallets(user_id, tokens)
    values (target_user_id, token_amount)
    on conflict (user_id) do update set
      tokens = public.user_wallets.tokens + excluded.tokens,
      updated_at = now();
  end if;
end;
$$;

revoke all on function public.credit_wallet_purchase(uuid, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.credit_wallet_purchase(uuid, integer, text, text)
  to service_role;
