-- Fix: si los dos usuarios generan su propio código en vez de que uno use
-- el del otro, la versión anterior los dejaba atascados — "ya tienes un
-- couple" bloqueaba redeem_invite_code incluso cuando ese couple era solo
-- una invitación propia sin usar por nadie. Ahora: una invitación propia
-- sin reclamar no cuenta como "ya emparejado", y se descarta sola si el
-- usuario decide unirse al código de su pareja en su lugar.

create or replace function public.create_couple()
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.couples;
  result public.couples;
begin
  select * into existing
  from public.couples
  where user_a_id = auth.uid() or user_b_id = auth.uid();

  if found then
    if existing.user_b_id is not null then
      raise exception 'user_already_in_couple';
    end if;
    -- Invitación propia todavía sin reclamar: se la devolvemos tal cual
    -- (idempotente) en vez de crear una segunda.
    return existing;
  end if;

  insert into public.couples (user_a_id, invite_code)
  values (auth.uid(), public.generate_invite_code())
  returning * into result;

  return result;
end;
$$;

create or replace function public.redeem_invite_code(p_code text)
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  own public.couples;
  target public.couples;
  new_cycle public.cycles;
begin
  select * into own
  from public.couples
  where user_a_id = auth.uid() or user_b_id = auth.uid();

  if found then
    if own.user_b_id is not null then
      raise exception 'user_already_in_couple';
    end if;
    -- Tenía su propia invitación sin reclamar — la descarta para unirse a
    -- la de su pareja en su lugar.
    delete from public.couples where id = own.id;
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
