# Manual Rápido de Supabase (Servicios Externos)

Este proyecto delega toda su infraestructura de base de datos y autenticación a **Supabase**. Dependemos de tres módulos principales:

1. **PostgreSQL** (Base de datos relacional)
2. **GoTrue Auth** (Autenticación de usuarios por email/contraseña)
3. **Storage** (Almacenamiento de archivos estáticos)

---

## 1. Configuración de Credenciales (.env)

Las credenciales de producción te serán entregadas manualmente por el administrador anterior del proyecto. Una vez te las entreguen, no debes compartirlas ni subirlas a GitHub. 

Deberás colocarlas en los archivos `.env` respectivos:

**En el Frontend (`frontend/.env`):**
```env
VITE_SUPABASE_URL=https://[id-del-proyecto].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...
```
*(La `ANON_KEY` es pública y segura para ser usada en el navegador, solo sirve para llamar a la API de Supabase).*

**En el Backend (`backend/.env`):**
```env
SUPABASE_URL=https://[id-del-proyecto].supabase.co
SUPABASE_KEY=eyJhb...  # ¡OJO! Esta es la SERVICE ROLE KEY (Secreta)
```
*(El backend usa la `SERVICE ROLE KEY` porque necesita permisos de administrador para subir imágenes al bucket en nombre de los usuarios saltándose el Row Level Security).*

---

## 2. Autenticación (GoTrue Auth)

El login, registro y validación del Frontend lo maneja el servicio de Auth de Supabase.

- **Dónde ver a los usuarios:** Si entras al Dashboard de Supabase en tu navegador, ve a la pestaña **Authentication** -> **Users**.
- **Roles:** El rol de la persona (`super_admin` o `delegado`) no vive en Supabase Auth, sino que vive en nuestra propia tabla `Usuarios` dentro de PostgreSQL. Ambos se conectan mediante la llave primaria `id_usuario` (UUID).

---

## 3. Storage (Buckets de Archivos)

Todos los comprobantes de pago, actas, cédulas, fotos de jugadores y logos de equipos se guardan en el Storage de Supabase.

- **Bucket:** El proyecto utiliza un bucket principal (usualmente llamado `basquet-vinculacion`).
- **Dónde ver los archivos:** En el Dashboard de Supabase, ve a **Storage** -> **Buckets**.
- **Acceso:** Las URLs de los documentos generados son firmadas (Signed URLs) o públicas según la configuración. En producción, el backend se encarga de subir los archivos conectándose al servicio como si fuera S3 (usando `boto3` o el cliente de Supabase).

---

## 4. Políticas de Seguridad (Row Level Security - RLS)

Actualmente, como el Backend de Flask centraliza todas las validaciones de seguridad con JWT, la base de datos de Supabase podría tener el Row Level Security (RLS) desactivado para las tablas, o tener reglas permisivas para el "Service Role". 

**Regla de Oro:** Todo el CRUD (crear, leer, actualizar, borrar) debe pasar por el backend de Flask para que las validaciones de negocio se ejecuten correctamente. El frontend nunca debe intentar hacer un `INSERT` directo en la base de datos desde el navegador.
