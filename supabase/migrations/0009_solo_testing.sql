-- TEMPORAL — quitar antes de lanzar (ver CLAUDE.md).
--
-- Marco no tiene 2 celulares/correos a mano para probar el flujo completo
-- de pareja ahora mismo. Esto le permite usar la app solo, sin bloquear el
-- resto de las pruebas (M2/M3) mientras tanto. No reemplaza el emparejamiento
-- real — cuando su pareja se una de verdad con `redeem_invite_code`, ese
-- flujo crea su propio ciclo nuevo como siempre (PRD §5.7); el ciclo "solo"
-- de acá queda abierto y huérfano, se descarta a mano al limpiar datos de
-- prueba antes de invitar usuarios reales.
create or replace function public.enable_solo_testing()
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.couples;
  new_cycle public.cycles;
begin
  select * into target
  from public.couples
  where user_a_id = auth.uid() and user_b_id is null;

  if not found then
    raise exception 'no_pending_couple';
  end if;

  if target.current_cycle_id is not null then
    return target;
  end if;

  insert into public.cycles (couple_id) values (target.id) returning * into new_cycle;

  update public.couples
  set current_cycle_id = new_cycle.id
  where id = target.id
  returning * into target;

  return target;
end;
$$;
