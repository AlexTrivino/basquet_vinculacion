-- ==============================================================================
-- Script de Supabase para Sincronización de Usuarios
-- ==============================================================================
-- Objetivo: Cada vez que un usuario se registra en Supabase Auth, 
-- se debe crear automáticamente una copia en la tabla `usuarios` del esquema `public`
-- para que el backend de Flask lo reconozca.

-- 1. Crear la función del trigger
CREATE OR REPLACE FUNCTION public.sync_user_to_public()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (
    id_usuario,
    nombre,
    correo,
    rol,
    estado,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, -- El UUID generado por Supabase Auth
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Sin Nombre'), -- Extrae el nombre del metadata enviado en el registro
    NEW.email,
    'delegado', -- Rol por defecto para nuevos registros
    'activo',
    NOW(),
    NOW()
  );
  
  -- OPCIONAL: Si queremos inyectar el rol en el JWT para que el frontend 
  -- pueda leerlo desde `app_metadata.role` (Fase 4), actualizamos el usuario:
  -- UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role": "delegado"}'::jsonb WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Vincular la función a un Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_public();
