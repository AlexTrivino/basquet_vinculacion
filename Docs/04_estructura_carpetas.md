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

El frontend utiliza una arquitectura orientada a características (*Feature-Driven Development*), evitando estructuras planas.

```text
frontend/
├── public/               # Archivos estáticos directos (favicon)
├── src/
│   ├── api/              # Cliente global Axios e interceptores (`axios.config.ts`)
│   ├── assets/           # Imágenes locales y CSS global (`index.css`)
│   ├── components/       # UI Genérica Reutilizable (Tablas, Modales, Botones, Badges)
│   ├── context/          # Manejo de Estado Global
│   │   └── AuthContext.tsx # Mantiene la sesión del usuario viva en toda la app
│   ├── features/         # Agrupación por Dominio de Negocio (El Core de la app)
│   │   ├── auth/         # Login, Recuperación de clave
│   │   ├── categorias/   # Gestión de categorías
│   │   ├── equipos/      # Perfiles, creación de equipos y reinscripción
│   │   ├── estadisticas/ # Dashboard admin, Bulk de Box Scores
│   │   ├── jugadores/    # Perfiles, creación de jugadores, documentos
│   │   ├── partidos/     # Calendarios, actas de partidos
│   │   ├── patrocinadores/
│   │   ├── plantillas/   # Asignación de roster a equipos
│   │   ├── sanciones/
│   │   └── torneos/      # Fixtures, Posiciones, Líderes
│   ├── hooks/            # Custom hooks transversales
│   ├── pages/            # Layouts y Vistas base que ensamblan los features
│   ├── routes/           # Configuración centralizada de React Router y HOCs (ProtectedRoute)
│   ├── utils/            # Helpers puros (formateo de fechas, string utilities)
│   ├── App.tsx           # Enrutador principal
│   └── main.tsx          # Punto de montaje de React
├── tests/                # Pruebas automatizadas del Frontend (Vitest + RTL)
├── package.json          # Dependencias y scripts de Node
├── vite.config.ts        # Configuración del Bundler
└── tailwind.config.ts    # Tokens de diseño y sistema visual
```
