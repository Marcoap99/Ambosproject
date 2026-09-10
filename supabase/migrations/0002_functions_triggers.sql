-- Ambos — funciones de negocio y triggers

-- 1) Al crear un usuario en auth.users (Google OAuth), reflejarlo en public.users
--    y darle su PaymentMethod "efectivo" automático (ver CLAUDE.md).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);

  insert into public.payment_methods (user_id, tipo)
  values (new.id, 'efectivo');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Helpers de couple, usados por RLS (0003) y por el resto de funciones acá.
create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.couples
  where user_a_id = auth.uid() or user_b_id = auth.uid()
  limit 1;
$$;

create or replace function public.partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when user_a_id = auth.uid() then user_b_id
    when user_b_id = auth.uid() then user_a_id
  end
  from public.couples
  where user_a_id = auth.uid() or user_b_id = auth.uid()
  limit 1;
$$;

-- 3) Emparejamiento (PRD §5.1.4). generate_invite_code produce un código corto
--    legible (sin 0/O/1/I para evitar confusión al compartirlo por WhatsApp).
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  code := '';
  for i in 1..6 loop
    code := code || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
  end loop;
  return code;
end;
$$;

-- create_couple: el usuario A genera su código de invitación. No crea ciclo
-- todavía — el ciclo nace recién cuando alguien se empareja (PRD §5.7).
create or replace function public.create_couple()
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.couples;
begin
  if exists (select 1 from public.couples where user_a_id = auth.uid() or user_b_id = auth.uid()) then
    raise exception 'user_already_in_couple';
  end if;

  insert into public.couples (user_a_id, invite_code)
  values (auth.uid(), public.generate_invite_code())
  returning * into result;

  return result;
end;
$$;

-- redeem_invite_code: el usuario B completa el emparejamiento y dispara la
-- creación del primer ciclo abierto (PRD §5.7). Casos borde de código
-- inválido/expirado quedan fuera del MVP (PRD §5.1) — un solo mensaje
-- genérico de error, sin distinguir motivos.
create or replace function public.redeem_invite_code(p_code text)
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.couples;
  new_cycle public.cycles;
begin
  if exists (select 1 from public.couples where user_a_id = auth.uid() or user_b_id = auth.uid()) then
    raise exception 'user_already_in_couple';
  end if;

  select * into target
  from public.couples
  where invite_code = p_code
    and user_b_id is null
    and user_a_id <> auth.uid()
  for update;

  if not found then
    raise exception 'invalid_code';
  end if;

  insert into public.cycles (couple_id) values (target.id) returning * into new_cycle;

  update public.couples
  set user_b_id = auth.uid(),
      fecha_emparejamiento = now(),
      current_cycle_id = new_cycle.id
  where id = target.id
  returning * into target;

  return target;
end;
$$;

-- 4) Liquidar ciclo (PRD §5.4/§5.7): archiva el ciclo abierto y abre el
-- siguiente en la misma transacción — nunca hay un momento sin ciclo abierto.
create or replace function public.liquidar_ciclo(p_proof_url text)
returns public.cycles
language plpgsql
security definer
set search_path = public
as $$
declare
  couple_id uuid := public.my_couple_id();
  open_cycle_id uuid;
  new_cycle public.cycles;
begin
  if couple_id is null then
    raise exception 'no_couple';
  end if;

  select id into open_cycle_id
  from public.cycles
  where couple_id = liquidar_ciclo.couple_id and status = 'abierto'
  for update;

  if open_cycle_id is null then
    raise exception 'no_open_cycle';
  end if;

  update public.cycles
  set status = 'liquidado', fecha_cierre = now(), proof_attachment_url = p_proof_url
  where id = open_cycle_id;

  insert into public.cycles (couple_id) values (couple_id) returning * into new_cycle;

  update public.couples set current_cycle_id = new_cycle.id where id = couple_id;

  return new_cycle;
end;
$$;
