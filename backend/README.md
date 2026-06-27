# 🏀 Sistema de Gestión de Torneos de Baloncesto — Backend

API REST para la administración integral de torneos de baloncesto: inscripciones, plantillas, partidos, estadísticas individuales, tabla de posiciones FIBA y generación de reportes PDF.

---

## Tech Stack

| Componente | Tecnología | Versión |
|-----------|------------|---------|
| **Framework** | Flask | 3.1 |
| **ORM** | SQLAlchemy | 2.0 |
| **Migraciones** | Alembic (Flask-Migrate) | 4.1 |
| **Base de datos** | PostgreSQL (Supabase) | 15+ |
| **Autenticación** | Supabase Auth (JWKS + HS256 fallback) | — |
| **Validación** | Marshmallow | 3.26 |
| **Storage** | Supabase Storage (S3-compatible via boto3) | — |
| **PDF** | ReportLab (Platypus) | 4.4 |
| **JWT** | PyJWT (PyJWKClient) | 2.10 |
| **Servidor WSGI** | Gunicorn | 23.0 |

---

## Despliegue Local

### Prerrequisitos

- Python 3.11+
- PostgreSQL 15+ (o cuenta en Supabase)
- Git

### 1. Clonar y entrar al directorio

```bash
git clone <url-del-repo>
cd Basquet_vinculacion/backend
```

### 2. Crear y activar el entorno virtual

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

Copia `.env.example` y completa los valores:

```bash
cp .env.example .env
```

**Variables requeridas:**

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SECRET_KEY` | Clave secreta de Flask | `mi-clave-super-secreta` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://postgres:pass@db.xyz.supabase.co:5432/postgres` |
| `SUPABASE_JWT_SECRET` | JWT Secret de Supabase (fallback HS256) | `super-secret-jwt-...` |
| `SUPABASE_URL` | URL base del proyecto Supabase | `https://xyz.supabase.co` |
| `SUPABASE_STORAGE_BUCKET` | Nombre del bucket de Storage | `archivos` |
| `SUPABASE_STORAGE_KEY` | Access Key S3 de Supabase Storage | — |
| `SUPABASE_STORAGE_SECRET` | Secret Key S3 de Supabase Storage | — |
| `CORS_ORIGINS` | URLs del frontend (separadas por coma) | `http://localhost:5173` |

### 5. Ejecutar migraciones

```bash
flask --app run db upgrade
```

### 6. Iniciar el servidor de desarrollo

```bash
flask --app run run --debug
```

El servidor estará disponible en `http://localhost:5000`.

### 7. Verificar que funciona

```bash
curl http://localhost:5000/api/health
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "El servidor está funcionando correctamente.",
  "data": { "database": "connected" }
}
```

---

## Estructura del Proyecto

```
backend/
├── run.py                    # Punto de entrada WSGI
├── requirements.txt          # Dependencias pinneadas
├── .env.example              # Template de variables de entorno
├── docs/
│   ├── arquitectura.md       # Decisiones arquitectónicas
│   └── api_referencia.md     # Referencia completa de endpoints
├── migrations/               # Migraciones Alembic
└── app/
    ├── __init__.py            # Fábrica Flask (create_app)
    ├── models/                # 14 modelos SQLAlchemy
    ├── schemas/               # DTOs Marshmallow (Create, Update, Public, Admin)
    ├── services/              # Lógica de negocio (SRP)
    ├── routes/                # Blueprints (rutas delgadas)
    └── utils/                 # Middleware, helpers, storage
```

Para detalles de la arquitectura, consultar [`docs/arquitectura.md`](docs/arquitectura.md).

Para la referencia completa de endpoints, consultar [`docs/api_referencia.md`](docs/api_referencia.md).

---

## Módulos Principales

### Entidades del Dominio

| Entidad | Modelo | Schema | Servicio | Ruta |
|---------|--------|--------|----------|------|
| Torneos | `torneo.py` | `torneo_schema.py` | `torneo_service.py` | `torneo_bp.py` |
| Categorías | `categoria.py` | `categoria_schema.py` | `categoria_service.py` | `categoria_bp.py` |
| Equipos | `equipo.py` | `equipo_schema.py` | `equipo_service.py` | `equipo_bp.py` |
| Inscripciones | `inscripcion.py` | `inscripcion_schema.py` | `inscripcion_service.py` | `inscripcion_bp.py` |
| Jugadores | `jugador.py` | `jugador_schema.py` | `jugador_service.py` | `jugador_bp.py` |
| Plantillas | `plantilla.py` | `plantilla_schema.py` | `plantilla_service.py` | `plantilla_bp.py` |
| Partidos | `partido.py` | `partido_schema.py` | `partido_service.py` | `partido_bp.py` |
| Estadísticas | `estadistica.py` | `stats_schema.py` | `stats_service.py` | `stats_bp.py` |
| Sanciones | `sancion.py` | (via `stats_schema.py`) | (via `stats_service.py`) | — |
| Reportes | — | — | `reportes_service.py` | `reportes_bp.py` |

### Módulos Transversales

| Módulo | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Auth Middleware | `utils/auth_middleware.py` | JWKS + HS256 fallback + RBAC |
| Respuestas | `utils/response.py` | `api_response()` / `api_error()` |
| Paginación | `utils/pagination.py` | `paginate_query()` obligatorio |
| Storage | `utils/storage.py` | Magic bytes + boto3 → Supabase S3 |
| Error Handlers | `utils/error_handlers.py` | 400, 401, 404, 405, 500 globales |
| Motor FIBA | `services/standings.py` | Tabla de posiciones (2 queries, defaultdict) |

---

## Despliegue en Producción (Render)

### Comando de inicio

```bash
gunicorn run:app --bind 0.0.0.0:$PORT --workers 2
```

### Variables de entorno

Configurar todas las variables listadas en `.env.example` en el dashboard de Render.

### Consideraciones

- `MAX_CONTENT_LENGTH` está configurado en 5 MB (protección contra uploads excesivos).
- Las migraciones deben ejecutarse manualmente o como parte del build command:
  ```bash
  flask --app run db upgrade && gunicorn run:app ...
  ```
