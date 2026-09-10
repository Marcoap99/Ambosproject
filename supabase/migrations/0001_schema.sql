-- Ambos — schema inicial (PRD §6)
-- Convención: nombres de tabla en snake_case plural; public.users espeja auth.users (1:1)
-- vía trigger (ver 0002_functions_triggers.sql), para poder tener FKs normales.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  email text not null,
  fecha_registro timestamptz not null default now()
);

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.users (id) on delete cascade,
  user_b_id uuid references public.users (id) on delete cascade,
  invite_code text not null unique,
  fecha_emparejamiento timestamptz,
  -- current_cycle_id se agrega después de crear cycles (referencia circular)
  constraint couples_user_a_ne_user_b check (user_a_id <> user_b_id)
);
create index couples_user_a_idx on public.couples (user_a_id);
create index couples_user_b_idx on public.couples (user_b_id);

create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  status text not null default 'abierto' check (status in ('abierto', 'liquidado')),
  fecha_inicio timestamptz not null default now(),
  fecha_cierre timestamptz,
  proof_attachment_url text
);
create index cycles_couple_idx on public.cycles (couple_id);
-- Invariante de negocio (PRD §5.7): un Couple tiene exactamente un ciclo abierto a la vez.
create unique index cycles_one_open_per_couple
  on public.cycles (couple_id)
  where status = 'abierto';

alter table public.couples
  add column current_cycle_id uuid references public.cycles (id);

-- 'efectivo' no está en el PRD §5.1 (onboarding) pero sí en §5.5 (registro manual) —
-- ver CLAUDE.md "Decisiones de implementación tomadas sin preguntar".
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  tipo text not null check (
    tipo in ('tarjeta_debito', 'tarjeta_credito', 'yape', 'plin', 'agora', 'banco', 'efectivo')
  ),
  banco text check (
    banco is null or banco in ('BCP', 'BBVA', 'Interbank', 'Scotiabank', 'BanBif')
  )
);
create index payment_methods_user_idx on public.payment_methods (user_id);

create table public.movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  cycle_id uuid not null references public.cycles (id),
  merchant text,
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'PEN' check (currency = 'PEN'),
  "timestamp" timestamptz not null default now(),
  source text not null check (source in ('email_parsed', 'manual')),
  payment_method_id uuid references public.payment_methods (id),
  payer_user_id uuid not null references public.users (id),
  classification text check (classification in ('personal', 'pareja')),
  split_ratio numeric(3, 2) not null default 0.5 check (split_ratio >= 0 and split_ratio <= 1),
  category text,
  classified_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index movements_couple_idx on public.movements (couple_id);
create index movements_cycle_idx on public.movements (cycle_id);
create index movements_user_idx on public.movements (user_id);
-- Clasificar (§5.3) filtra por "mis propios movimientos capturados hoy":
create index movements_user_unclassified_idx
  on public.movements (user_id, "timestamp")
  where classification is null and deleted_at is null;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
