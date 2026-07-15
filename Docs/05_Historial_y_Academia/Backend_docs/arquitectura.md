# Arquitectura del Backend — Sistema de Torneos de Baloncesto

## Visión General

El backend es una API REST monolítica construida con **Flask 3.1**, diseñada bajo el principio de
**separación estricta de responsabilidades** y optimizada para un tráfico proyectado de decenas
de usuarios concurrentes con picos esporádicos de ~100 simultáneos (YAGNI aplicado).

---

## Patrón Controlador-Servicio

Cada entidad del dominio se implementa en 3 capas con responsabilidades aisladas:

```
Request HTTP
    │
    ▼
┌──────────────────┐   Ruta delgada: valida payload con Marshmallow,
│  routes/*_bp.py  │   extrae datos del request y llama al servicio.
│  (Controlador)   │   NO contiene lógica de negocio.
└────────┬─────────┘
         │
         ▼
┌──────────────────┐   Lógica pura: validaciones de negocio, queries,
│ services/*_svc   │   transacciones. Recibe datos planos (dicts),
│  (Servicio)      │   retorna objetos o lanza ValueError.
└────────┬─────────┘
         │
         ▼
┌──────────────────┐   Mapeo ORM: columnas, relaciones, constraints.
│  models/*.py     │   Cada modelo expone `.activos()` (soft delete).
│  (Modelo)        │
└──────────────────┘
```

### Reglas implementadas

| Regla | Descripción |
|-------|-------------|
| **Rutas delgadas** | El controlador solo recibe → valida → delega → responde. Máximo 20 líneas de código. |
| **Servicio como SRP** | Cada servicio encapsula la lógica de una sola entidad. Las dependencias entre entidades se resuelven con imports explícitos dentro de las funciones del servicio. |
| **`api_response` / `api_error`** | Toda respuesta JSON pasa por helpers centralizados (`utils/response.py`) para garantizar el formato estandarizado del RNF-MAN-02. |
| **Paginación obligatoria** | Todo endpoint GET de listado usa `paginate_query()` con límites sanitizados (`max_per_page=50`). |
| **Schemas DTO diferenciados** | Cada entidad tiene schemas separados: `Create`, `Update`, `Public`, `Admin`. Los campos sensibles (IDs internos, timestamps) solo aparecen en `Admin`. |

---

## Arquitectura Híbrida de Autenticación

El sistema separa **identidad** (quién eres) de **autorización** (qué puedes hacer):

```
┌─────────────────────────────────────┐
│       Supabase Auth (GoTrue)        │
│                                     │
│  - Registro / Login de usuarios     │
│  - Emisión de JWT (ES256 / HS256)   │
│  - Publicación de JWKS endpoint     │
│  - Gestión de sesiones              │
└──────────────┬──────────────────────┘
               │  JWT con claim "sub" (UUID)
               ▼
┌─────────────────────────────────────┐
│     auth_middleware.py (Flask)       │
│                                     │
│  1. Verificación JWKS (asimétrico)  │
│     → PyJWKClient(cache_keys=True)  │
│     → ES256/RS256 con clave pública │
│                                     │
│  2. Fallback HS256 (simétrico)      │
│     → SUPABASE_JWT_SECRET           │
│     → API Keys legacy               │
│                                     │
│  3. audience='authenticated'        │
│                                     │
│  4. Inyección en flask.g:           │
│     → g.usuario_id = sub (UUID)     │
│     → g.usuario_rol = None          │
└──────────────┬──────────────────────┘
               │  Si allowed_roles ≠ None
               ▼
┌─────────────────────────────────────┐
│     PostgreSQL (tabla usuarios)      │
│                                     │
│  - Verificación de existencia       │
│  - Verificación de estado='activo'  │
│  - Lectura del campo `rol`          │
│  - g.usuario_rol = usuario.rol      │
│  - Comparación: rol in allowed_roles│
└─────────────────────────────────────┘
```

**¿Por qué esta separación?**
- Supabase maneja la complejidad de autenticación (hashing, rate limiting, tokens de refresh) sin código propio.
- PostgreSQL local controla el RBAC porque los roles del dominio (`super_admin`, `delegado`) son específicos del negocio, no del proveedor de identidad.
- Si se migra de Supabase a otro proveedor (Auth0, Firebase), solo cambia el middleware — el RBAC permanece intacto.

---

## Decisiones de Optimización

### YAGNI aplicado (descartado por innecesario)

| Elemento descartado | Justificación |
|---------------------|---------------|
| Flask-Caching en tabla de posiciones | Con ~100 usuarios, PostgreSQL resuelve el cálculo en <50ms. TTL de caché innecesario. |
| `threading.Lock` en cliente S3 | Gunicorn con workers pre-fork no comparte memoria entre procesos. El singleton es seguro por proceso. |
| Paginación en `recalcular_tabla()` | Un torneo tiene máximo ~200 partidos. La query completa cabe holgadamente en memoria. |

### Optimizaciones implementadas

| Técnica | Dónde se aplica | Impacto |
|---------|-----------------|---------|
| **`selectinload`** | `reportes_service.py` (estadísticas de partido) | Evita producto cartesiano en relaciones 1:N. Emite 2 SELECTs compactos en vez de 1 JOIN con N filas duplicadas. |
| **`joinedload`** | Inscripciones, plantillas, partidos (relaciones 1:1) | Trae entidades relacionadas en un solo SELECT con JOIN, eliminando N+1. |
| **Bulk INSERT (SQLAlchemy 2.x)** | `stats_service.py` (estadísticas + sanciones) | `db.session.execute(insert(Model), lista)` emite un solo INSERT multi-row. Para 15 jugadores: 1 round-trip vs 15. |
| **`defaultdict` en standings** | `standings.py` (motor de posiciones) | Procesamiento de estadísticas 100% en memoria. Solo 2 queries SQL totales (partidos + equipos con `in_`). |
| **Magic bytes (sin `python-magic`)** | `storage.py` (validación de archivos) | Inspección nativa de los primeros 12 bytes del stream. Sin dependencia de sistema operativo. |
| **PDF en memoria (`BytesIO`)** | `reportes_service.py` (planilla FIBA) | Zero disk I/O en el servidor. El buffer viaja directo de ReportLab a `send_file`. |
| **SELECT → mutar → commit** | `inscripcion_bp.py` (comprobante) | Un solo SELECT inicial. El objeto se muta en memoria y se commitea. Sin consultas redundantes. |

---

## Diagrama de Módulos

```
backend/
├── run.py                          # Punto de entrada WSGI
├── requirements.txt                # Dependencias pinneadas
├── .env.example                    # Variables de entorno requeridas
├── migrations/                     # Alembic (auto + manuales)
│   └── versions/
│       ├── (auto)_initial.py
│       └── a1b2c3d4e5f6_wo.py     # Manual: CheckConstraint finalizado_wo
│
└── app/
    ├── __init__.py                 # Fábrica Flask (create_app)
    │
    ├── models/                     # 14 modelos SQLAlchemy
    │   ├── usuario.py              # UUID PK, rol, estado
    │   ├── torneo.py               # Entidad raíz
    │   ├── categoria.py            # Solo lectura (seeders)
    │   ├── equipo.py               # FK → usuario (delegado)
    │   ├── inscripcion.py          # UniqueConstraint(torneo, equipo, cat)
    │   ├── jugador.py              # Validación cédula/edad
    │   ├── plantilla.py            # Pivote equipo-jugador-torneo
    │   ├── partido.py              # Dual FK (local/visitante)
    │   ├── estadistica.py          # Rendimiento individual
    │   ├── sancion.py              # Disciplina FIBA
    │   ├── documentacion.py        # Archivos generales
    │   ├── documento_jugador.py    # Docs por jugador
    │   ├── patrocinador.py         # Sponsors
    │   └── patrocinador_torneo.py  # Pivote sponsor-torneo
    │
    ├── schemas/                    # DTOs Marshmallow
    │   ├── torneo_schema.py        # Public, Admin, Create, Update
    │   ├── equipo_schema.py
    │   ├── inscripcion_schema.py   # + EstadoSchema
    │   ├── jugador_schema.py       # Validación cédula, fecha
    │   ├── plantilla_schema.py     # + Nested jugador
    │   ├── partido_schema.py       # + Nested equipos
    │   ├── stats_schema.py         # Bulk DTO + sancion_tipo
    │   └── categoria_schema.py
    │
    ├── services/                   # Lógica de negocio (SRP)
    │   ├── torneo_service.py
    │   ├── equipo_service.py
    │   ├── inscripcion_service.py  # flush() + IntegrityError
    │   ├── jugador_service.py
    │   ├── plantilla_service.py    # 3 validaciones FIBA
    │   ├── partido_service.py      # Dispara recálculo standings
    │   ├── stats_service.py        # Anti-spoofing O(1) + bulk insert
    │   ├── standings.py            # Motor posiciones FIBA (2 queries)
    │   ├── reportes_service.py     # PDF Platypus en BytesIO
    │   └── categoria_service.py
    │
    ├── routes/                     # Blueprints (rutas delgadas)
    │   ├── health_bp.py
    │   ├── torneo_bp.py            # + /posiciones
    │   ├── equipo_bp.py
    │   ├── inscripcion_bp.py       # + /comprobante
    │   ├── jugador_bp.py           # + /foto
    │   ├── plantilla_bp.py
    │   ├── partido_bp.py
    │   ├── stats_bp.py             # POST /bulk
    │   ├── reportes_bp.py          # GET planilla PDF
    │   └── categoria_bp.py
    │
    └── utils/
        ├── auth_middleware.py      # JWKS + HS256 fallback + RBAC
        ├── response.py             # api_response / api_error
        ├── pagination.py           # paginate_query (obligatorio)
        ├── storage.py              # Magic bytes + boto3 → Supabase S3
        └── error_handlers.py       # 400, 401, 404, 405, 500
```

---

## Modelo de Datos (Relaciones Clave)

```
Usuario (1) ──── (N) Equipo
                      │
                      ├── (N) Inscripción ──── (1) Torneo
                      │         │
                      │         └── (1) Categoría
                      │
                      ├── (N) Plantilla ──── (1) Jugador
                      │         │
                      │         └── (1) Torneo
                      │
                      └── (N) Partido (como local o visitante)
                                │
                                ├── (N) Estadística ──── (1) Jugador
                                │
                                └── (N) Sanción ──── (1) Jugador
```

### Restricciones de integridad destacadas

| Constraint | Tabla | Propósito |
|-----------|-------|-----------|
| `UniqueConstraint(id_torneo, id_equipo, id_categoria)` | `inscripciones` | Impide inscripción duplicada del mismo equipo en la misma categoría de un torneo. |
| `CheckConstraint(estado IN (..., 'finalizado_wo', ...))` | `partidos` | Garantiza que solo estados FIBA válidos se persistan en la BD. |
| `CheckConstraint(estado IN ('activo', 'inactivo'))` | `plantillas` | Soft delete controlado a nivel de BD. |
