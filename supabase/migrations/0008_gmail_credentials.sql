-- Ambos — credenciales de Gmail para el pipeline de M3
-- PRD §8: "Tokens OAuth de Gmail: cifrados en reposo, nunca expuestos al
-- cliente (todo el acceso a Gmail pasa por el backend)."
--
-- Tabla separada de `users` a propósito: a diferencia del resto del schema,
-- esta NO tiene ninguna policy de RLS para el rol 'authenticated' — ni
-- siquiera el dueño del token puede leer su propia fila desde el cliente.
-- Solo el backend, usando la service role key (que bypassea RLS por
-- diseño de Supabase), puede leer/escribir acá. "Cifrado en reposo" lo
-- cubre el cifrado de disco de Postgres en Supabase — no se agrega
-- cifrado de aplicación extra (evita el problema de dónde guardar esa
-- otra llave de cifrado, que sería el mismo problema un nivel más abajo).
create table public.gmail_credentials (
  user_id uuid primary key references public.users (id) on delete cascade,
  refresh_token text not null,
  watch_expiration timestamptz,
  history_id text,
  updated_at timestamptz not null default now()
);

alter table public.gmail_credentials enable row level security;
-- (sin policies — deny-by-default para 'authenticated'; solo service_role)
