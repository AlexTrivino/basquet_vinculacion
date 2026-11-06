# Estructura del Proyecto

## 📂 Directorio Raíz (`/`)

```text
basquet_vinculacion/
├── backend/            # API REST (Motor de Lógica: Flask + SQLAlchemy)
├── frontend/           # Interfaz de Usuario SPA (React + Vite)
├── Docs/               # Documentación centralizada del proyecto
├── deploy.sh           # Script automatizado para despliegue en producción (Ubuntu)
└── README.md           # Guía rápida del proyecto
```

---

## ⚙️ Estructura del Backend (`/backend`)

El backend sigue un patrón arquitectónico de capas (Routes -> Services -> Models):

```text
backend/
├── app/
│   ├── __init__.py           # Configuración base, CORS, JWT y conexión a BD
│   ├── models/               # Clases SQLAlchemy (Equipos, Partidos, Torneos, etc.)
│   ├── routes/               # Endpoints REST expuestos (Blueprints de Flask)
│   ├── schemas/              # DTOs y Validación de datos (Marshmallow)
│   ├── services/             # Lógica de negocio core (Motor FIBA, inscripciones)
│   └── utils/                
│       ├── auth_middleware.py # Decorador que intercepta y valida JWT de Supabase
│       └── error_handlers.py  # Respuestas JSON estandarizadas ante fallos
├── tests/                    # Pruebas unitarias automatizadas (Pytest)
├── seeders/                  # Scripts para poblar BD con datos iniciales o de prueba
├── migrations/               # Historial de versiones de la base de datos (Alembic)
├── requirements.txt          # Dependencias de Python (Flask, SQLAlchemy, boto3, etc.)
├── .env                      # Variables de entorno secretas (no se sube a Git)
└── run.py                    # Punto de entrada para levantar el servidor local
```

---

## 🎨 Estructura del Frontend (`/frontend`)

El frontend usa Screaming Architecture: cada pantalla vive en el módulo de negocio al que pertenece, `app/` arma la aplicación y `shared/` tiene lo que no es de ningún negocio (fases 9 y 10 de `specs/`).

```text
frontend/
├── public/               # Archivos estáticos directos (favicon, siluetas)
├── src/
│   ├── app/              # main.tsx (providers), router.tsx, MainLayout, Navbar, Sidebar, ErrorBoundary y páginas de error
│   ├── shared/
│   │   ├── ui/           # UI kit genérico (tablas, modales, botones, badges, Escudo, Esquinas, withSuspense)
│   │   ├── api/          # Cliente Axios (`axios.config.ts`), tipos de la API y catálogo de torneos y categorías
│   │   └── lib/          # Helpers puros (nombres, almacenamiento de la sesión)
│   ├── modules/          # Un módulo por negocio; de afuera se entra solo por su index.ts
│   │   ├── auth/         # Sesión (AuthContext), ProtectedRoute, login, registro y perfil
│   │   ├── auspicios/    # Patrocinadores
│   │   ├── sanciones/
│   │   ├── inscripciones/ # Inscripciones, plantillas y reglas de negocio
│   │   ├── visor/        # Buscador de jugadores del rol visor
│   │   ├── partidos/     # Programación, cierre, actas y box score
│   │   ├── equipos/      # Directorio, perfil, administración y panel del delegado
│   │   ├── jugadores/    # Perfil y administración de jugadores
│   │   ├── flyers/       # Estudio de flyers y flyer de la fecha
│   │   ├── estadisticas/ # Panel del admin y líderes
│   │   ├── torneos/      # Detalle del torneo, calendario, posiciones, llaves y fase final
│   │   └── portada/      # Página de inicio, pie y contacto
│   ├── index.css         # CSS global y tokens de Tailwind (@theme)
│   ├── tests/setup.ts    # Configuración de Vitest + RTL
│   └── fronteras.test.ts # Reglas de app/, shared/ y modules/
├── package.json          # Dependencias y scripts de Node
└── vite.config.ts        # Configuración del bundler (alias @/ → src)
```
