-- check_ins: el PRD describe el check-in diario y la racha visual de 7 días
-- (§5.2) pero no define una tabla en §6 — se agrega acá para poder calcular
-- la racha y el banner de "día de gracia" sin adivinar nada en el cliente.
-- "fecha" la calcula el cliente en su propia zona horaria (PRD §5.2: corte
-- de día es medianoche a medianoche del dispositivo, no del servidor).
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  fecha date not null,
  tuvo_gastos boolean not null,
  respondido_at timestamptz not null default now(),
  unique (user_id, fecha)
);
create index check_ins_user_fecha_idx on public.check_ins (user_id, fecha desc);

alter table public.check_ins enable row level security;

create policy check_ins_all_self on public.check_ins
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
