create table public.user_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp bigint not null default 0 check (xp >= 0),
  tokens integer not null default 0 check (tokens >= 0),
  updated_at timestamptz not null default now()
);

create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null check (currency in ('xp', 'token')),
  amount integer not null check (amount <> 0),
  reason text not null,
  reference_type text,
  reference_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create unique index wallet_ledger_reference_unique
  on public.wallet_ledger(user_id, currency, reference_type, reference_id)
  where reference_type is not null and reference_id is not null;

create table public.feature_unlock_catalog (
  code text primary key,
  name jsonb not null,
  description jsonb not null default '{}',
  feature_code text not null,
  duration_hours integer not null check (duration_hours > 0),
  token_cost integer not null check (token_cost > 0),
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.user_feature_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_code text not null,
  catalog_code text references public.feature_unlock_catalog(code),
  source text not null check (source in ('token', 'admin', 'promotion')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);

create index user_feature_unlocks_active_idx
  on public.user_feature_unlocks(user_id, feature_code, expires_at desc);

create table public.token_packages (
  code text primary key,
  name text not null,
  tokens integer not null check (tokens > 0),
  bonus_tokens integer not null default 0 check (bonus_tokens >= 0),
  price_vnd integer not null check (price_vnd > 0),
  price_usd integer not null check (price_usd > 0),
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.user_wallets enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.feature_unlock_catalog enable row level security;
alter table public.user_feature_unlocks enable row level security;
alter table public.token_packages enable row level security;

create policy "wallet_own_read" on public.user_wallets
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "wallet_ledger_own_read" on public.wallet_ledger
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "unlock_catalog_read" on public.feature_unlock_catalog
  for select to authenticated using (is_active or (select private.is_admin()));
create policy "feature_unlocks_own_read" on public.user_feature_unlocks
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "token_packages_read" on public.token_packages
  for select to authenticated using (is_active or (select private.is_admin()));

grant select on public.user_wallets, public.wallet_ledger,
  public.feature_unlock_catalog, public.user_feature_unlocks,
  public.token_packages to authenticated;

create or replace function private.spend_tokens_for_unlock(
  target_user_id uuid,
  target_catalog_code text
)
returns table (
  feature_code text,
  expires_at timestamptz,
  tokens_remaining integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  catalog public.feature_unlock_catalog%rowtype;
  wallet public.user_wallets%rowtype;
  existing_expiry timestamptz;
  new_expiry timestamptz;
begin
  if target_user_id <> (select auth.uid()) and not (select private.is_admin()) then
    raise exception 'Not authorized';
  end if;

  select * into catalog
  from public.feature_unlock_catalog
  where code = target_catalog_code and is_active
  for share;
  if not found then raise exception 'Unlock option not found'; end if;

  insert into public.user_wallets(user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  select * into wallet
  from public.user_wallets
  where user_id = target_user_id
  for update;
  if wallet.tokens < catalog.token_cost then
    raise exception 'Insufficient tokens';
  end if;

  select max(unlock.expires_at) into existing_expiry
  from public.user_feature_unlocks unlock
  where unlock.user_id = target_user_id
    and unlock.feature_code = catalog.feature_code
    and unlock.expires_at > now();
  new_expiry := greatest(coalesce(existing_expiry, now()), now())
    + make_interval(hours => catalog.duration_hours);

  update public.user_wallets
  set tokens = tokens - catalog.token_cost, updated_at = now()
  where user_id = target_user_id;

  insert into public.wallet_ledger(
    user_id, currency, amount, reason, reference_type, reference_id, metadata
  ) values (
    target_user_id, 'token', -catalog.token_cost, 'feature_unlock',
    'unlock', gen_random_uuid()::text,
    jsonb_build_object('catalog_code', catalog.code, 'feature_code', catalog.feature_code)
  );

  insert into public.user_feature_unlocks(
    user_id, feature_code, catalog_code, source, expires_at
  ) values (
    target_user_id, catalog.feature_code, catalog.code, 'token', new_expiry
  );

  return query
    select catalog.feature_code, new_expiry, wallet.tokens - catalog.token_cost;
end;
$$;

grant execute on function private.spend_tokens_for_unlock(uuid, text)
  to authenticated;

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

create or replace function private.award_wallet_after_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  xp_reward integer;
  token_reward integer;
begin
  xp_reward := greatest(
    5,
    coalesce(new.duration_seconds, 0) / 30
      + coalesce(round(new.score / 5), 0)::integer
  );
  token_reward := case
    when coalesce(new.score, 0) >= 90 then 3
    when coalesce(new.score, 0) >= 70 then 2
    else 1
  end;

  insert into public.user_wallets(user_id, xp, tokens)
  values (new.user_id, xp_reward, token_reward)
  on conflict (user_id) do update set
    xp = public.user_wallets.xp + excluded.xp,
    tokens = public.user_wallets.tokens + excluded.tokens,
    updated_at = now();

  insert into public.wallet_ledger(
    user_id, currency, amount, reason, reference_type, reference_id
  ) values
    (new.user_id, 'xp', xp_reward, 'learning_event', 'learning_event', new.id::text),
    (new.user_id, 'token', token_reward, 'learning_event', 'learning_event', new.id::text)
  on conflict do nothing;

  return new;
end;
$$;

create trigger award_wallet_after_learning_event
  after insert on public.learning_events
  for each row execute function private.award_wallet_after_event();

insert into public.feature_unlock_catalog(
  code, name, description, feature_code, duration_hours, token_cost, position
) values
  ('writing_1d', '{"vi":"Sửa bài viết 1 ngày","en":"Writing review for 1 day"}',
   '{"vi":"Mở khóa Writing bằng AI trong 24 giờ.","en":"Unlock AI Writing for 24 hours."}',
   'writing', 24, 35, 10),
  ('speaking_1d', '{"vi":"Luyện nói 1 ngày","en":"Speaking for 1 day"}',
   '{"vi":"Mở khóa luyện nói và microphone trong 24 giờ.","en":"Unlock Speaking for 24 hours."}',
   'speaking', 24, 30, 20),
  ('translation_7d', '{"vi":"Dịch thuật 7 ngày","en":"Translation for 7 days"}',
   '{"vi":"Mở khóa Translation trong 7 ngày.","en":"Unlock Translation for 7 days."}',
   'translation', 168, 120, 30),
  ('progress_7d', '{"vi":"Phân tích tiến độ 7 ngày","en":"Progress analytics for 7 days"}',
   '{"vi":"Mở khóa dashboard tiến độ trong 7 ngày.","en":"Unlock progress analytics for 7 days."}',
   'progress', 168, 100, 40),
  ('document_tutor_1d', '{"vi":"Gia sư theo tài liệu 1 ngày","en":"Document tutor for 1 day"}',
   '{"vi":"Hỏi đáp AI theo tài liệu trong 24 giờ.","en":"Unlock document-grounded tutoring for 24 hours."}',
   'document_tutor', 24, 60, 50),
  ('competition_7d', '{"vi":"Thi đua 7 ngày","en":"Competition for 7 days"}',
   '{"vi":"Tham gia bảng xếp hạng và thử thách trong 7 ngày.","en":"Unlock competition for 7 days."}',
   'competition', 168, 90, 60)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  feature_code = excluded.feature_code,
  duration_hours = excluded.duration_hours,
  token_cost = excluded.token_cost,
  is_active = true,
  position = excluded.position;

insert into public.token_packages(
  code, name, tokens, bonus_tokens, price_vnd, price_usd, position
) values
  ('token_200', 'Starter Tokens', 200, 0, 49000, 199, 10),
  ('token_600', 'Booster Tokens', 500, 100, 99000, 399, 20),
  ('token_1500', 'Power Tokens', 1200, 300, 199000, 799, 30)
on conflict (code) do update set
  name = excluded.name,
  tokens = excluded.tokens,
  bonus_tokens = excluded.bonus_tokens,
  price_vnd = excluded.price_vnd,
  price_usd = excluded.price_usd,
  is_active = true,
  position = excluded.position;

insert into public.user_wallets(user_id)
select id from auth.users
on conflict (user_id) do nothing;
