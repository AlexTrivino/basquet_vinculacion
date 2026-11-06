# Informe de seguridad · OWASP Top 10:2025

Revisión del repositorio después de la migración (backend, frontend, scripts y dependencias), noviembre de 2026. Se leyó el código y se corrieron `pip-audit` y `npm audit`; no se atacó ni se consultó el servidor ni el Supabase de producción. Las categorías son las del [OWASP Top 10:2025](https://help.hcl-software.com/appscan/Enterprise/10.11.0/topics/r_owasp_top_10_2025_report.html): A01 control de acceso, A02 configuración, A03 cadena de suministro, A04 criptografía, A05 inyección, A06 diseño inseguro, A07 autenticación, A08 integridad, A09 registro y alertas, A10 manejo de excepciones.

Punto de partida: el registro es público y el trigger de Supabase deja cada cuenta nueva como delegado **activo**. Todo lo que puede hacer un delegado lo puede hacer cualquiera con un correo.

## Parchado en el repositorio

| # | OWASP | Gravedad | Qué pasaba | Arreglo |
| --- | --- | --- | --- | --- |
| 1 | A01 | Crítica | El alta y la edición de jugadores aceptaban `url_foto`, `url_cedula` y `url_acta_bachiller`. Al dar de baja al jugador o reemplazar el documento, el backend mandaba un DELETE a Supabase con la llave `service_role` y esa ruta sin revisar: cualquiera podía borrar cualquier archivo del bucket (cédulas, actas, comprobantes, logos), y con `../` la ruta salía del bucket hacia otras APIs de Supabase con la misma llave (no se probó contra el Supabase real). | Esos campos ya no se aceptan (422) y `borrar_archivo` solo borra claves del bucket propio. |
| 2 | A01 | Alta | `GET /api/jugadores/buscar` y el 409 de `POST /api/jugadores` devolvían teléfono, correo, fecha de nacimiento y los enlaces a la cédula y al acta de cualquier jugador a quien escribiera su cédula. | Datos completos solo para el super_admin y el delegado del jugador; los demás reciben lo justo para vincularlo. |
| 3 | A01 | Alta | `POST /api/inscripciones` y `/reinscribir` inscribían cualquier equipo: le abrían un borrador al dueño (que ya no podía abrir el suyo), copiaban su plantilla y respondían con su nombre y su correo. | Un delegado solo inscribe equipos suyos (403). |
| 4 | A07 | Alta | Las contraseñas de los dos super_admin de producción estaban escritas en `seed_database.py`, y siguen en el historial de git. | La opción 4 las pide con `getpass`. **Hay que cambiarlas** (ver abajo). |
| 5 | A06 | Alta | `reset_database.py` borraba toda la base y todos los usuarios sin preguntar (la confirmación estaba comentada y `confirm.txt` la contestaba). El seed, sin terminal, hacía el seed completo: un super_admin de prueba con contraseña conocida. | Los scripts que borran piden confirmación y muestran la base; el seed sin terminal no hace nada. |
| 6 | A03 | Alta | PyJWT 2.10.1 (16 avisos), cryptography 45.0.7, flask-cors 5.0.1, Werkzeug 3.1.8, python-dotenv 1.1.1 y urllib3 2.7.0; en el frontend, axios 1.18.1 (contaminación de prototipos), zod, React Router 6 (sin parche en la versión 6), vite y vitest. | Versiones corregidas, fuera los paquetes que no se importan (boto3 y compañía) y `npm ci` en `deploy.sh`. `pip-audit` y `npm audit` sin hallazgos. |
| 7 | A05 | Media | Los nombres de torneo, fase, ubicación y equipos entraban sin escapar a los párrafos de la planilla PDF: un equipo llamado `<img src="…"/>` hacía que el servidor leyera un archivo o una URL, y un `&` o un `<` daban 500. | Se escapan. |
| 8 | A04 · A07 | Media | Con la clave del JWKS se aceptaba HS256: un token así daba 500 (TypeError de PyJWT). Si el JWKS no respondía, cada pedido esperaba 30 s. | JWKS solo con ES256 y RS256; espera máxima de 5 s. |
| 9 | A10 | Media | Las llamadas a Storage no tenían límite de espera: un Storage colgado dejaba colgado un worker de gunicorn (con dos, el sitio entero). Los errores de red del hilo de borrado tumbaban el hilo. | 30 s como máximo y errores atrapados. |
| 10 | A06 | Media | `POST /api/inscripciones/completa` abría inscripciones en torneos en curso o finalizados; un id que no fuera número daba 500. | Revisa que el torneo esté programado (422) y los números (400). |
| 11 | A09 | Media | Los 401 y 403 no quedaban en ningún lado, y detrás de nginx todas las IP eran 127.0.0.1. | Una línea de log por rechazo con método, ruta, IP real (`ProxyFix`) y código. |
| 12 | A01 | Baja | Una cuenta inactiva entraba al panel y cambiaba su nombre; el nombre podía quedar vacío o dar 500 con más de 100 caracteres. | `/api/usuarios/me` pide cuenta activa; el nombre, de 1 a 100 caracteres. |
| 13 | A10 | Baja | Un archivo de más de 5 MB daba 500 en vez de 413; `?id_categoria=²` daba 500. | 413 y los demás errores HTTP con su código; `isdecimal()`. |
| 14 | A02 | Baja | Respuestas sin `nosniff` y con datos personales que el navegador o un proxy podían guardar. | `X-Content-Type-Options: nosniff` siempre y `Cache-Control: no-store` con token. |

Se revisó y está bien: las consultas van con parámetros (SQLAlchemy), React escapa el texto y no hay `dangerouslySetInnerHTML` ni `eval` (React 19 bloquea los enlaces `javascript:`), los archivos se validan por sus primeros bytes y su tamaño, CORS solo acepta `CORS_ORIGINS`, los `.env` del frontend que están en git solo tienen las variables públicas `VITE_` (la anon key es pública por diseño), `SECRET_KEY` no se usa (no hay sesiones de Flask) y los tokens exigen `sub`, `exp` y `aud`.

## Pendiente fuera del repositorio

### 1. RLS en Supabase (crítico si está apagado)

Las tablas del sistema están en el esquema `public` del Postgres de Supabase y la anon key viaja en el JavaScript del sitio. Si las tablas no tienen RLS, cualquiera puede leerlas y modificarlas por `https://<proyecto>.supabase.co/rest/v1/<tabla>` sin pasar por el backend: todas las cédulas, teléfonos y correos, y también borrar datos. Supabase lo marca en *Advisors → Security*.

Comprobación (solo lectura), en el editor SQL de Supabase:

```sql
select c.relname as tabla, c.relrowsecurity as rls, pg_get_userbyid(c.relowner) as duenio from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by 1;
```

Si alguna sale con `rls = false` y el dueño es el mismo usuario de `DATABASE_URL` del backend (el dueño de una tabla no pasa por RLS, así que el backend sigue igual), se activa en todas con una sola sentencia. El frontend no lee tablas con la anon key, solo usa Auth:

```sql
do $$ declare t record; begin for t in select tablename from pg_tables where schemaname = 'public' loop execute format('alter table public.%I enable row level security', t.tablename); end loop; end $$;
```

Después se vuelve a correr la consulta de arriba y se prueba el sitio (login, una inscripción, el panel del admin).

### 2. Contraseñas y cuentas (alto)

- Cambiar ya las contraseñas de los dos super_admin que estaban en `seed_database.py` (Supabase → *Authentication → Users*). El repositorio está en GitHub: hay que darlas por conocidas aunque se borren del historial.
- Revisar que solo existan los super_admin esperados (por si el seed de prueba corrió alguna vez contra producción):

```sql
select correo, estado, created_at from usuarios where rol = 'super_admin' order by created_at;
```

### 3. Supabase Auth y Storage (medio)

- *Authentication → Sign In / Providers*: confirmación de correo obligatoria, CAPTCHA (Turnstile o hCaptcha) y límites de registro. Hoy cada cuenta nueva es un delegado activo al instante; si el negocio lo permite, que el trigger las cree inactivas y el admin las active (hace falta una pantalla para eso).
- El bucket es público: un documento (cédula, acta, comprobante) se puede leer con su URL, que lleva un UUID imposible de adivinar. Desde esta fase esas URL solo le llegan al admin y al delegado del jugador. Lo más seguro es un bucket privado para documentos con URL firmadas (cambio de diseño).
- Si el proyecto ya firma los tokens con claves asimétricas (JWKS), revocar el secreto JWT viejo y quitar `SUPABASE_JWT_SECRET` del `.env`.

### 4. nginx y el servidor (medio)

Cabeceras para el sitio (la CSP primero como `Content-Security-Policy-Report-Only` unos días, revisando la consola del navegador, y después como `Content-Security-Policy`):

```nginx
server_tokens off;
client_max_body_size 6m;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;  # solo con HTTPS
add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://<proyecto>.supabase.co; connect-src 'self' https://<proyecto>.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
```

Para `/api`, límite de pedidos por IP y las cabeceras que lee `ProxyFix`:

```nginx
# en http { }:  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
location /api/ {
    limit_req zone=api burst=30 nodelay;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:5000;
}
```

- gunicorn escuchando solo en `127.0.0.1` y el firewall con 22, 80 y 443.
- `chmod 600 backend/.env`, del usuario del servicio.
- Opcional: `pip uninstall -y boto3 botocore s3transfer jmespath marshmallow-sqlalchemy` en el venv del servidor (`pip install -r` no quita lo que salió de `requirements.txt`).

## Riesgos de diseño (sin cambiar)

- Un jugador es uno solo para todos los equipos: un delegado que lo suma a su plantilla (aunque sea en un borrador) pasa a ver sus datos y puede reemplazar sus documentos. Para cerrarlo hace falta decidir cómo son los traspasos (aprobación del admin, o documentos por inscripción).
- Un jugador libre (sin plantilla activa) lo edita cualquier delegado.
- La plantilla se puede cambiar con el torneo en curso.
- La vista pública del equipo incluye el `id_usuario` de su delegado; el perfil lo compara con `/api/usuarios/me`. Sería mejor un `es_mio` calculado en el backend.
- El buscador por cédula sigue diciendo el nombre y la fecha de nacimiento a cualquier delegado que pruebe cédulas: el límite de pedidos de nginx lo frena.
