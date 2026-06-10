create table public.billing_plans (
  code text primary key check (code in ('free', 'basic', 'plus', 'pro')),
  name text not null,
  description jsonb not null default '{}',
  price_vnd integer not null default 0 check (price_vnd >= 0),
  price_usd integer not null default 0 check (price_usd >= 0),
  ai_requests_per_day integer not null check (ai_requests_per_day > 0),
  document_limit integer not null check (document_limit > 0),
  features jsonb not null default '[]',
  position integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null default 'free' references public.billing_plans(code),
  provider text not null default 'stripe' check (provider in ('stripe', 'manual')),
  provider_subscription_id text unique,
  provider_price_id text,
  currency text check (currency in ('vnd', 'usd')),
  status text not null default 'inactive'
    check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.billing_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'stripe',
  provider_event_id text not null unique,
  provider_object_id text,
  event_type text not null,
  plan_code text references public.billing_plans(code),
  amount integer,
  currency text,
  status text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  metric text not null check (metric in ('ai_request', 'document_upload')),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date, metric)
);

create index subscriptions_status_idx on public.subscriptions(status, plan_code);
create index billing_transactions_user_created_idx on public.billing_transactions(user_id, created_at desc);

alter table public.billing_plans enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_transactions enable row level security;
alter table public.usage_counters enable row level security;

create policy "billing_plans_public_read" on public.billing_plans
  for select using (is_active or (select private.is_admin()));
create policy "billing_customers_own_read" on public.billing_customers
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "subscriptions_own_read" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "billing_transactions_own_read" on public.billing_transactions
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "usage_counters_own_read" on public.usage_counters
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()));

create or replace function private.consume_daily_usage(
  target_user_id uuid,
  target_metric text,
  target_limit integer
)
returns table (allowed boolean, used integer, quota integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_quantity integer;
begin
  if target_user_id <> (select auth.uid()) and not (select private.is_admin()) then
    raise exception 'Not authorized';
  end if;
  insert into public.usage_counters (user_id, usage_date, metric, quantity)
  values (target_user_id, current_date, target_metric, 0)
  on conflict (user_id, usage_date, metric) do nothing;

  select quantity into current_quantity
  from public.usage_counters
  where user_id = target_user_id
    and usage_date = current_date
    and metric = target_metric
  for update;

  if current_quantity >= target_limit then
    return query select false, current_quantity, target_limit;
    return;
  end if;

  update public.usage_counters
  set quantity = quantity + 1, updated_at = now()
  where user_id = target_user_id
    and usage_date = current_date
    and metric = target_metric
  returning quantity into current_quantity;

  return query select true, current_quantity, target_limit;
end;
$$;

grant select on public.billing_plans, public.billing_customers, public.subscriptions,
  public.billing_transactions, public.usage_counters to authenticated;
grant execute on function private.consume_daily_usage(uuid, text, integer) to authenticated;

insert into public.billing_plans (
  code, name, description, price_vnd, price_usd, ai_requests_per_day,
  document_limit, features, position
) values
  (
    'free', 'Free',
    '{"vi":"Dùng thử Lingora với giới hạn cơ bản.","en":"Try Lingora with basic limits."}',
    0, 0, 5, 1,
    '["5 AI requests/day","1 document","Core learning modules"]',
    0
  ),
  (
    'basic', 'Basic',
    '{"vi":"Bắt đầu lộ trình học cá nhân với AI.","en":"Start a personal AI learning journey."}',
    99000, 499, 50, 20,
    '["50 AI requests/day","20 documents","All skill modules","Learning progress"]',
    1
  ),
  (
    'plus', 'Plus',
    '{"vi":"AI nâng cao, tài liệu và luyện tập chuyên sâu.","en":"Advanced AI, documents, and intensive practice."}',
    199000, 899, 200, 100,
    '["200 AI requests/day","100 documents","Document-grounded tutor","Competition and challenges","Advanced feedback"]',
    2
  ),
  (
    'pro', 'Pro',
    '{"vi":"Hạn mức cao và ưu tiên model cho người học chuyên nghiệp.","en":"High limits and priority models for serious learners."}',
    399000, 1699, 1000, 1000,
    '["1000 AI requests/day","1000 documents","Priority models","Full analytics","Early access features"]',
    3
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  price_vnd = excluded.price_vnd,
  price_usd = excluded.price_usd,
  ai_requests_per_day = excluded.ai_requests_per_day,
  document_limit = excluded.document_limit,
  features = excluded.features,
  position = excluded.position,
  updated_at = now();
