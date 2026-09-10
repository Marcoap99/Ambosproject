-- Fix: liquidar_ciclo usaba una variable local llamada "couple_id", igual
-- que la columna couple_id de cycles/movements. Postgres reporta "column
-- reference couple_id is ambiguous" en el INSERT/UPDATE — encontrado
-- probando en vivo. Se renombra la variable a v_couple_id (convención
-- estándar de plpgsql: prefijo v_ para variables locales, evita choques
-- de nombre con columnas).

create or replace function public.liquidar_ciclo(p_proof_url text)
returns public.cycles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid := public.my_couple_id();
  open_cycle_id uuid;
  new_cycle public.cycles;
begin
  if v_couple_id is null then
    raise exception 'no_couple';
  end if;

  select id into open_cycle_id
  from public.cycles
  where couple_id = v_couple_id and status = 'abierto'
  for update;

  if open_cycle_id is null then
    raise exception 'no_open_cycle';
  end if;

  update public.cycles
  set status = 'liquidado', fecha_cierre = now(), proof_attachment_url = p_proof_url
  where id = open_cycle_id;

  insert into public.cycles (couple_id) values (v_couple_id) returning * into new_cycle;

  update public.couples set current_cycle_id = new_cycle.id where id = v_couple_id;

  return new_cycle;
end;
$$;
