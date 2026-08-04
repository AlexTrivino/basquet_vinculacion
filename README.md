# 🏀 Plataforma de Gestión de Torneos — Exalumnos Salesianos de Manta

Plataforma deportiva moderna para la gestión integral de torneos de baloncesto: inscripción de equipos con flujo de wizard, validación de documentos y nóminas, calendario de partidos, estadísticas individuales FIBA y tablas de posiciones automáticas en tiempo real.

> **Proyecto de Vinculación** — Alex Triviño

---

## 📐 Arquitectura

El proyecto utiliza una **arquitectura desacoplada y feature-driven** con tres capas independientes:

```
┌─────────────────────────┐       JWT        ┌─────────────────────────┐     SQLAlchemy     ┌─────────────────────────┐
│                         │  ─────────────►  │                         │  ───────────────►  │                         │
│   React 18 + TypeScript │                  │   Flask 3.1 REST API    │                    │   Supabase              │
│   Vite + Tailwind CSS   │  ◄─────────────  │   (Python 3.11+)        │  ◄───────────────  │   PostgreSQL            │
│   (Vercel)              │     JSON Resp    │   (Render)              │     Query Results  │   Auth · Storage (S3)   │
└────────────┬────────────┘                  └─────────────────────────┘                    └─────────────────────────┘
             │                                                                                          ▲
             │                    Supabase Auth (Login, Sesión, Recuperación)                           │
             └──────────────────────────────────────────────────────────────────────────────────────────┘
```

| Capa | Tecnología | Responsabilidad | Despliegue |
|------|-----------|-----------------|------------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS | UI/UX responsiva, gestión de estado con React Query y Context API, formularios con React Hook Form + Zod | Vercel |
| **Backend** | Python 3.11+ / Flask 3.1 + SQLAlchemy 2.0 | API REST, lógica de negocio, validación JWT (JWKS + HS256), motor estadístico FIBA, control de accesos RBAC y almacenamiento en S3 | Render (Gunicorn) |
| **BaaS** | Supabase | PostgreSQL, GoTrue Auth (email/password), Storage S3 (vía boto3 sin tocar disco) | Supabase Cloud |

### Flujo de Datos y Seguridad

1. **Autenticación Delegada:** React interactúa con Supabase Auth (`signInWithPassword`, reset de contraseña).
2. **Tokens JWT:** Supabase emite tokens JWT que el cliente almacena y despacha vía interceptor Axios (`Authorization: Bearer <token>`).
3. **Validación de Identidad y Roles (RBAC):** Middleware en Flask valida el JWT y asigna `g.usuario_id` y `g.usuario_rol` (`'super_admin'` | `'delegado'`).
4. **Control de Propiedad Estricto (Anti-IDOR):** Las mutaciones de plantillas y documentos verifican que el delegado sea dueño del equipo correspondiente antes de procesar cambios.
5. **Cero Contraseñas en BD:** La tabla `usuarios` en PostgreSQL **no almacena hashes ni contraseñas**, delegando toda la seguridad a Supabase Auth.

---

## 🗂️ Estructura del Proyecto

```
basquet_vinculacion/
├── backend/                          # API REST (Flask + SQLAlchemy)
│   ├── app/
│   │   ├── __init__.py               # Application Factory: CORS, DB, Blueprints
│   │   ├── models/                   # Modelos SQLAlchemy 2.0 (14 entidades)
│   │   │   ├── usuario.py            # UUID PK enlazado a Supabase Auth
│   │   │   ├── torneo.py             # Competiciones con fechas y estados
│   │   │   ├── categoria.py          # Género + rangos de edad (Sub-25, +30, etc.)
│   │   │   ├── equipo.py             # Clubes vinculados a un delegado
│   │   │   ├── jugador.py            # Datos personales + cédula única + URLs de documentos
│   │   │   ├── inscripcion.py        # Pivote Torneo-Equipo-Categoría con estados
│   │   │   ├── plantilla.py          # Roster Jugador-Equipo-Torneo con número de camiseta
│   │   │   ├── partido.py            # Encuentros con marcadores y fases
│   │   │   ├── estadistica.py        # Stats individuales por partido (puntos, faltas, etc.)
│   │   │   └── sancion.py            # Tarjetas y suspensiones disciplinarias
│   │   ├── routes/                   # Controladores Blueprints (auth, torneos, inscripciones, etc.)
│   │   ├── schemas/                  # Validación y serialización con Marshmallow 3
│   │   ├── services/                 # Lógica de negocio (standings FIBA, plantillas, etc.)
│   │   └── utils/                    # Middlewares JWT, boto3 storage, paginador, respuestas API
│   ├── tests/                        # Suite de pruebas unitarias y de integración (pytest)
│   ├── seed_database.py              # Script interactivo para poblar base de datos mock
│   ├── requirements.txt              # Dependencias fijadas
│   └── run.py                        # Entry point local
│
├── frontend/                         # SPA (React 18 + TypeScript + Vite)
│   ├── src/
│   │   ├── api/                      # Instancia configurada de Axios + Interceptores
│   │   ├── components/               # UI Kit: Navbar, Sidebar, DataGridTable, AsyncButton, etc.
│   │   ├── context/                  # AuthContext.tsx (sesión global y switch de equipo activo)
│   │   ├── features/                 # Módulos por dominio de negocio (Feature-Driven)
│   │   │   ├── auth/                 # Login y recuperación de clave
│   │   │   ├── torneos/              # Explorador de torneos, posiciones y estadísticas
│   │   │   ├── equipos/              # InscripcionWizard (Paso 1: Club, Paso 2: Roster)
│   │   │   ├── plantillas/           # GestorPlantilla, modales de confirmación y dorsales
│   │   │   ├── partidos/             # Calendario y programación de partidos
│   │   │   ├── estadisticas/         # Carga y visualización de líderes
│   │   │   └── sanciones/            # Registro y visualización de faltas
│   │   ├── pages/                    # Vistas de alto nivel (Público, Delegado, Admin)
│   │   ├── routes/                   # React Router v6 + ProtectedRoute (RBAC)
│   │   └── types/                    # Tipados TypeScript estrictos alineados a Marshmallow
│   └── package.json                  # Dependencias y scripts de Vitest
│
└── documentacion/                    # Documentación técnica y directivas de desarrollo
```

---

## 🏗️ Reglas de Negocio Principales

- **Tamaño de Plantilla:** Cada equipo debe registrar un **mínimo de 10 jugadores** para estar formalmente habilitado a competir, y un **máximo de 18 jugadores**.
- **Límite de Equipos por Delegado:** Un usuario con rol `delegado` puede crear y gestionar un **máximo de 3 equipos**.
- **Flujo de Inscripción en 2 Pasos (Wizard):**
  1. *Paso 1 — Datos del Club:* Registro de nombre, categoría y comprobante de pago bancario.
  2. *Paso 2 — Nómina de Jugadores:* Carga de jugadores con dorsales y cédulas. Una vez cumplido el mínimo de 10 jugadores, se habilita el envío formal a revisión.
- **Unicidad de Dorsales:** No se permiten números de camiseta duplicados dentro del mismo equipo. La interfaz valida la unicidad en tiempo real.
- **Cálculo de Edades por Año Calendario:** Para torneos por categorías de edad, el cálculo se rige por el año de nacimiento (`año_actual - año_nacimiento`), garantizando igualdad competitiva para todo el ciclo anual.
- **Puntuación y Standings FIBA:** Victoria = 2 puntos, Derrota = 1 punto, No Presentación (Walkover) = 0 puntos. Desempates automáticos por Diferencia de Canastas (DIF) y Puntos a Favor (PF).
- **Borrado Lógico (Soft Delete):** Cero eliminaciones físicas de registros competitivos para preservar la integridad histórica de los torneos.

---

## 🔒 Seguridad y Almacenamiento

- **Control de Acceso en Endpoints:** Validación de propiedad por delegado en creación, actualización y eliminación de jugadores o documentos (`/foto`, `/cedula`, `/acta`).
- **Almacenamiento Seguro (Supabase Storage vía S3/boto3):**
  - Cero archivos guardados en disco local.
  - Validación estricta de Magic Bytes (tipos MIME reales) y límites de tamaño (4 MB para fotos y documentos).
  - Eliminación asíncrona de archivos huérfanos al actualizar fotos o soft-deletear entidades.

---

## 🛠️ Instalación y Puesta en Marcha Local

### Prerrequisitos

- Python 3.11+
- Node.js 18+ y npm
- Git
- Cuenta en [Supabase](https://supabase.com) con proyecto configurado (Auth y Storage)

---

### 1. Backend (Flask)

```bash
cd backend

# Crear entorno virtual
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux / Mac

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# (Completar con tus credenciales de Supabase DB, JWT y Storage)

# Aplicar migraciones de base de datos
flask db upgrade

# (Opcional) Poblar base de datos con datos de prueba
python seed_database.py

# Iniciar servidor de desarrollo
python run.py
# → API disponible en http://localhost:5000
```

---

### 2. Frontend (React + Vite)

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
# → Aplicación disponible en http://localhost:5173
```

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con suites de pruebas unitarias y de integración tanto en Backend como en Frontend:

```bash
# Ejecutar tests del Backend (24 tests de schemas, endpoints, filtros y storage)
cd backend
pytest

# Ejecutar tests del Frontend con Vitest (21 tests de componentes, modales y auth)
cd frontend
npm test -- --run
```

---

## 👥 Roles del Sistema

| Rol | Alcance y Vistas |
|---|---|
| **Público** | Landing page, explorador de torneos, tablas de posiciones en vivo, calendario de partidos, líderes de anotación y carrusel de auspiciantes. |
| **Delegado** | Dashboard de control de equipos, wizard de inscripción con subida de comprobantes, gestor integral de plantilla con asignación de dorsales y documentos. |
| **Super Admin** | Panel de administración global, auditoría dual con visor de comprobantes (Aprobar/Rechazar), fixture y programación de partidos, registro de estadísticas en acta digital. |

---

## 📄 Documentación Técnica Adicional

En la carpeta [`documentacion/`](documentacion/) se encuentran disponibles las especificaciones completas:
- **Modelado conceptual y relacional de la BD.**
- **Matriz de requerimientos funcionales y no funcionales.**
- **Diagramas de arquitectura y especificaciones de endpoints.**

---

## 📝 Licencia

Proyecto desarrollado con fines académicos y de vinculación con la comunidad — Universidad Laica Eloy Alfaro de Manabí (ULEAM). Todos los derechos reservados.
