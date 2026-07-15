# Estructura del Proyecto: Arquitectura híbrida

Esta estructura refleja una separación estricta de responsabilidades: React maneja la UI y la Autenticación directa con Supabase, mientras que Flask actúa como el motor de reglas de negocio validando las peticiones seguras.

basquet_vinculacion/
├── .github/                      # CI/CD: Automatización de pruebas y despliegues
│   └── workflows/
│       └── test.yml              
│
├── backend/                      # API REST (Motor de Lógica: Flask + SQLAlchemy)
│   ├── app/
│   │   ├── __init__.py           # Configuración base, CORS y conexión a PostgreSQL
│   │   ├── models/               # Tablas en clases Python (Equipos, Partidos, Torneos)
│   │   ├── routes/               # Endpoints protegidos (ej. POST /api/partidos)
│   │   ├── schemas/              # Validación estricta de datos de entrada
│   │   ├── services/             # Lógica matemática (Cálculo de tabla de posiciones, desempates)
│   │   └── utils/                
│   │       ├── auth_middleware.py # ¡Clave! Decorador para interceptar y validar el JWT de Supabase
│   │       └── error_handlers.py  # Respuestas JSON consistentes ante fallos
│   ├── tests/                    # Pruebas automatizadas (pytest)
│   │   ├── test_models.py
│   │   └── test_services.py      # Pruebas para asegurar que las matemáticas de los puntos no fallen
│   ├── seeders/                  # Scripts para llenar la BD con equipos de prueba
│   ├── migrations/               # Historial autogenerado de la base de datos (Alembic)
│   ├── docs/                     # Postman collection o Swagger.yaml
│   ├── .env                      # Variables locales (DATABASE_URL)
│   ├── .flake8                   # Reglas estrictas de código limpio en Python
│   ├── requirements.txt          # flask, flask-sqlalchemy, supabase-py (o boto3), PyJWT
│   └── run.py                    # Script para levantar el servidor en localhost:5000
│
├── frontend/                     # Interfaz UI (React + Vite)
│   ├── public/
│   ├── src/
│   │   ├── assets/               # Logos, íconos y CSS global
│   │   ├── components/           # UI Reutilizable (Tablas de posiciones, Modales, Botones)
│   │   ├── context/              # Estado Global
│   │   │   └── AuthContext.jsx   # Mantiene la sesión del usuario viva en toda la app
│   │   ├── pages/                # Vistas (Login, PanelAdmin, TorneoPublico)
│   │   ├── services/             
│   │   │   ├── api.js            # Configuración de Axios para hablar con Flask (inyecta el JWT)
│   │   │   └── supabaseClient.js # Conexión a Supabase Auth (Login, Recuperar Contraseña)
│   │   ├── App.jsx               # Enrutador principal (Rutas públicas y privadas)
│   │   └── main.jsx              # Punto de montaje
│   ├── tests/                    # Pruebas de la interfaz visual
│   ├── .env                      # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
│   ├── .eslintrc.cjs             # Reglas de código limpio en JS/React
│   ├── .prettierrc               # Formateador de código
│   ├── package.json              
│   └── vite.config.js            
│
├── documentacion/                # Todo el conocimiento centralizado
│   ├── Requisitos.md
│   ├── Modelado_BD.md
│   ├── Esquema_del_proyecto.md   
│   └── Estructura_Carpetas.md
│
└── README.md                     # Guía de instalación rápida para levantar el proyecto