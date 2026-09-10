-- Ambos — Storage para comprobantes de liquidación (PRD §5.4/§8)
-- Bucket privado — nunca público. Las URLs se firman con vida corta al
-- momento de mostrarlas (ver app/ciclos), nunca se guarda una URL pública.

insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

-- Los objetos se guardan como "{couple_id}/{archivo}" — la policy exige que
-- el primer segmento de la ruta sea el couple del usuario autenticado.
create policy comprobantes_insert_own_couple on storage.objects
  for insert with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = public.my_couple_id()::text
  );

create policy comprobantes_select_own_couple on storage.objects
  for select using (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = public.my_couple_id()::text
  );
