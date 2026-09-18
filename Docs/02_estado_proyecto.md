# Estado Actual del Proyecto — Septiembre 2026

## 🟢 Estado: En Producción

El proyecto está **completamente operativo y en producción** con datos reales persistidos. 

---

## Infraestructura de Producción

| Componente | Ubicación |
|---|---|
| **Servidor** | Ubuntu Server (VPS propio) en `/var/www/basquet_vinculacion` |
| **Backend** | Flask + Gunicorn, gestionado como servicio SystemD (`basquet.service`) |
| **Frontend** | React compilado (`dist/`), servido por Nginx como archivos estáticos |
| **Proxy Inverso** | Nginx (sirve el frontend y redirige `/api/*` a Gunicorn) |
| **Base de Datos** | PostgreSQL remota alojada en Supabase Cloud |
| **Autenticación** | Supabase Auth (GoTrue) |
| **Almacenamiento** | Supabase Storage (fotos, cédulas, comprobantes) vía boto3/S3 |
| **Dominio** | `baloncestomanta.com` |

### Flujo de Despliegue

El despliegue se realiza ejecutando `./deploy.sh` en el servidor:

```
[Local] git push origin main
     ↓
[Servidor] ./deploy.sh
     ├── 1. git pull origin main
     ├── 2. cd frontend && npm install && npm run build
     ├── 3. cd backend && pip install -r requirements.txt && flask db upgrade
     └── 4. sudo systemctl restart basquet && sudo systemctl reload nginx
```

> **Importante:** Si el `git pull` falla por conflictos locales en el servidor (ej. `package-lock.json`), ejecutar `git checkout -- <archivo>` antes de `./deploy.sh`.

---

## Variables de Entorno Requeridas

El backend necesita un archivo `.env` en `backend/` con las siguientes variables:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | URI de conexión a PostgreSQL de Supabase |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_KEY` | Service Role Key de Supabase (para Storage) |
| `SUPABASE_JWT_SECRET` | Secret para validación de JWT (fallback HS256) |
| `S3_ENDPOINT` | Endpoint S3-compatible de Supabase Storage |
| `S3_ACCESS_KEY` | Access key para boto3 |
| `S3_SECRET_KEY` | Secret key para boto3 |
| `S3_BUCKET` | Nombre del bucket de Storage |

---

## Datos en Producción (Cifras Aproximadas)

| Entidad | Cantidad |
|---|---|
| Jugadores registrados | ~289 |
| Equipos activos | ~28 |
| Categorías | 7 (masculinas y femeninas) |
| Partidos programados/finalizados | Calendario activo |
| Usuarios (delegados + admin) | Múltiples delegados + super_admin |

---

## Funcionalidades Implementadas al 100%

### Vista Pública
- Landing page con grid de torneos activos
- Tabla de posiciones FIBA por categoría (con desempates)
- Calendario de partidos (sin filtro de categoría, muestra todos)
- Líderes estadísticos por categoría (puntos, triples, rebotes, asistencias, tapones, tiros libres)
- Perfil público de equipo (participaciones, plantilla, historial de partidos)
- Perfil público de jugador (estadísticas globales y por torneo)
- Directorio de equipos con filtros por torneo y categoría
- Carrusel de auspiciantes/patrocinadores

### Panel Delegado
- Login con Supabase Auth
- Dashboard con estado de inscripciones
- Wizard de inscripción en 2 pasos (datos del club + comprobante de pago)
- Reinscripción automática (clonado de plantilla de torneo anterior)
- Gestor de plantilla (agregar/quitar jugadores, asignar dorsales, subir cédulas)

### Panel Super Admin
- Dashboard con métricas y actividad reciente
- Auditoría de inscripciones (aprobar/rechazar con visor de comprobantes)
- CRUD de torneos y categorías
- Programación de partidos (fixture por fases)
- Gestor de estadísticas y resultados (carga bulk por partido)
- Generación de planillas FIBA en PDF
- Gestión de sanciones
- Gestión de patrocinadores
- Gestión administrativa de jugadores

---

## Bugs Conocidos y Deuda Técnica

### ⚠️ Pendiente de Ejecución (SQL)
- **89 registros en `plantillas` con `id_categoria = NULL`:** Son datos históricos del inicio del torneo. Deben corregirse ejecutando el siguiente SQL en Supabase:
  ```sql
  UPDATE plantillas p
  SET id_categoria = i.id_categoria
  FROM inscripciones i
  WHERE p.id_equipo = i.id_equipo
    AND p.id_torneo = i.id_torneo
    AND i.estado_inscripcion = 'aprobado'
    AND p.id_categoria IS NULL;
  ```

### Deuda Técnica
- **Compresión de imágenes:** El plan original incluía compresión a WebP en el frontend antes de subir a S3, pero aún no se implementa.
- **Testing:** Existen 24 tests en backend (pytest) y 21 tests en frontend (Vitest + RTL), pero la cobertura no es exhaustiva.

### Consideraciones de Seguridad
- **SafeSQLAlchemy:** El backend tiene una protección en `app/__init__.py` que **bloquea `db.drop_all()`** en entornos de producción. No intentar desactivarla.
- **Cero cambios destructivos:** Prohibido ejecutar `DROP TABLE`, `DROP COLUMN` o alteraciones de tipos incompatibles sin migración segura.
- **Retrocompatibilidad:** Cualquier cambio a endpoints o schemas debe mantener compatibilidad con los datos ya almacenados.

---

## Tecnologías y Versiones

| Capa | Stack |
|---|---|
| **Backend** | Python 3.12 · Flask 3.1 · SQLAlchemy 2.0 · Marshmallow 3 · Gunicorn |
| **Frontend** | Node 18+ · React 18 · TypeScript · Vite · Tailwind CSS · React Query |
| **Infra** | Ubuntu Server · Nginx · SystemD · PostgreSQL (Supabase) |
