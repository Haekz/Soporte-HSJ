-- Refuerzo de seguridad para Soporte HSJ
-- Ejecutar UNA vez en Supabase > SQL Editor > New query > Run (después de supabase.sql e inventario.sql).
-- Se puede volver a ejecutar sin problema.

-- =====================================================================
-- 1. Nadie sin sesión iniciada (rol "anon") puede tocar las tablas.
--    Las políticas ya lo impiden; esto lo bloquea también a nivel de permisos.
-- =====================================================================
revoke all on public.reportes from anon;
revoke all on public.equipos  from anon;

-- =====================================================================
-- 2. Administradores
--    Un usuario es administrador si su "app_metadata" tiene rol = admin.
--    Ese dato solo se puede cambiar desde el panel o este editor, nunca desde la página.
-- =====================================================================
create or replace function public.es_admin()
returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'rol', '') = 'admin'
$$;

-- Para hacer administrador a alguien (cambie el correo y ejecute solo esta línea):
-- update auth.users set raw_app_meta_data = raw_app_meta_data || '{"rol":"admin"}' where email = 'nombre.apellido@redsalud.gob.cl';
-- La persona debe cerrar sesión y volver a entrar para que el cambio se aplique.

-- =====================================================================
-- 3. Reportes
-- =====================================================================
-- Crear: el campo creado_por siempre queda con el usuario real (no se puede falsificar).
drop policy if exists "crear reportes" on public.reportes;
create policy "crear reportes" on public.reportes for insert to authenticated
  with check (creado_por = auth.uid());

-- Editar: desde la página solo se cambia el estado y sus fechas.
-- Nadie puede reescribir la falla, la serie o la foto de un reporte ya guardado.
revoke update on public.reportes from authenticated;
grant update (estado, reportado_el, resuelto_el) on public.reportes to authenticated;

-- Eliminar: solo quien creó el reporte o un administrador.
drop policy if exists "eliminar reportes" on public.reportes;
create policy "eliminar reportes" on public.reportes for delete to authenticated
  using (creado_por = auth.uid() or public.es_admin());

-- Largo máximo de los textos (evita que alguien llene la base con textos enormes).
alter table public.reportes drop constraint if exists reportes_largos;
alter table public.reportes add constraint reportes_largos check (
  char_length(tipo) <= 60 and char_length(serie) <= 100 and char_length(modelo) <= 150
  and char_length(empresa) <= 100 and char_length(ubicacion) <= 200
  and char_length(falla) <= 2000 and char_length(coalesce(informante, '')) <= 150
  and char_length(foto) <= 200
) not valid;  -- "not valid": no revisa los registros antiguos, solo los nuevos

-- =====================================================================
-- 4. Fotos (bucket privado "fotos")
-- =====================================================================
-- Subir: solo dentro del bucket y con el formato de nombre que usa la página (AAAA-MM-DD/uuid.jpg).
drop policy if exists "subir fotos" on storage.objects;
create policy "subir fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and name ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}/[0-9a-f-]{36}\.jpg$');

-- Borrar: solo quien subió la foto o un administrador.
drop policy if exists "borrar fotos" on storage.objects;
create policy "borrar fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (owner_id = auth.uid()::text or public.es_admin()));

-- =====================================================================
-- 5. Revisión: debe mostrar rowsecurity = true en ambas tablas.
-- =====================================================================
select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename in ('reportes', 'equipos');
