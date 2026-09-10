-- Ambos — Row Level Security
-- La regla que más importa acá es §7.4 del PRD: un usuario nunca puede leer
-- un Movement de su pareja mientras esa persona no lo haya clasificado.
-- Se aplica en la policy de SELECT de movements, no solo en el frontend.

alter table public.users enable row level security;
alter table public.couples enable row level security;
alter table public.cycles enable row level security;
alter table public.payment_methods enable row level security;
alter table public.movements enable row level security;
alter table public.push_subscriptions enable row level security;

-- users: cada quien se ve a sí mismo y a su pareja (nombre/avatar en header, §DESIGN_SYSTEM §6)
create policy users_select_self_or_partner on public.users
  for select using (id = auth.uid() or id = public.partner_id());

create policy users_update_self on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- couples: solo sus dos miembros. Insert/emparejamiento van por las funciones
-- create_couple / redeem_invite_code (security definer), no por INSERT/UPDATE directo del cliente.
create policy couples_select_members on public.couples
  for select using (user_a_id = auth.uid() or user_b_id = auth.uid());

-- cycles: visibles para los dos miembros del couple. Se crean/actualizan
-- solo vía redeem_invite_code / liquidar_ciclo (security definer).
create policy cycles_select_couple on public.cycles
  for select using (couple_id = public.my_couple_id());

-- payment_methods: dueño y su pareja pueden verlo (transparencia de §3 — el
-- medio de pago de un gasto ya clasificado como pareja es visible para ambos).
-- Solo el dueño puede crear/editar/borrar los suyos.
create policy payment_methods_select_self_or_partner on public.payment_methods
  for select using (user_id = auth.uid() or user_id = public.partner_id());

create policy payment_methods_insert_self on public.payment_methods
  for insert with check (user_id = auth.uid());

create policy payment_methods_update_self on public.payment_methods
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy payment_methods_delete_self on public.payment_methods
  for delete using (user_id = auth.uid());

-- movements: la regla dura. Siempre veo lo mío (incluso sin clasificar, lo
-- necesita la pantalla de Clasificar). De mi pareja, SOLO si ya clasificó
-- (classification is not null) — antes de eso no existe para mí, aunque el
-- backend ya lo tenga capturado del correo.
create policy movements_select_own_or_partner_classified on public.movements
  for select using (
    user_id = auth.uid()
    or (user_id = public.partner_id() and classification is not null)
  );

create policy movements_insert_own on public.movements
  for insert with check (user_id = auth.uid() and payer_user_id = auth.uid());

-- Editar (reclasificar/categoría) solo lo propio, y solo si el ciclo sigue
-- abierto — un ciclo liquidado queda de solo lectura (PRD §5.4/§5.6).
create policy movements_update_own_open_cycle on public.movements
  for update using (
    user_id = auth.uid()
    and cycle_id in (select id from public.cycles where status = 'abierto')
  )
  with check (user_id = auth.uid());

-- Sin policy de DELETE a propósito: "borrar" es soft-delete (UPDATE deleted_at),
-- nunca un DELETE real (PRD §5.6) — sin policy, Postgres lo deniega por defecto.

-- push_subscriptions: privado, nadie más necesita verlo.
create policy push_subscriptions_all_self on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
