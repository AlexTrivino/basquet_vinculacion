# Roadmap de Desarrollo (Etapas del Proyecto Híbrido)

Este plan de trabajo sigue un enfoque iterativo e incremental, dividiendo el desarrollo en fases lógicas para mitigar errores, garantizar la seguridad de los datos y asegurar la estabilidad antes del despliegue.

---

## Fase 1: Entorno de Desarrollo, Linters e Infraestructura Base
El objetivo de esta fase es dejar listo el espacio de trabajo en tu máquina local y sincronizar la base de datos vacía en la nube.

*   [ ] **Inicialización:** Crear el repositorio Git local y estructurar las carpetas principales (`backend/`, `frontend/`, `documentacion/`).
*   [ ] **Calidad de Código:** Configurar los archivos de linters y formateadores (`.flake8` para Python; `.eslintrc.cjs` y `.prettierrc` para React).
*   [ ] **CI/CD Inicial:** Crear el archivo `.github/workflows/test.yml` para ejecutar automáticamente la revisión de sintaxis y linters en cada push.
*   [ ] **Entorno de Python:** Crear el entorno virtual (`venv`), activarlo e instalar las dependencias core (`Flask`, `Flask-SQLAlchemy`, `Flask-Migrate`, `psycopg2-binary`, `python-dotenv`, `PyJWT`).
*   [ ] **Aprovisionamiento en la Nube:** Crear el proyecto gratuito en Supabase, activar el módulo de Auth (Email) y crear el bucket en Storage para los archivos.
*   [ ] **Modelado Inicial:** Traducir las tablas del diagrama a clases de SQLAlchemy en `backend/app/models/`.
*   [ ] **Primera Migración:** Configurar el `.env` del backend con la URI de Supabase y ejecutar `flask db init`, `flask db migrate` y `flask db upgrade` para levantar las tablas vacías.

---

## Fase 2: Seguridad, Middlewares y Validaciones
Antes de escribir rutas para torneos o partidos, blindaremos la API para que solo acepte peticiones válidas y seguras.

*   [ ] **Control de Accesos (CORS):** Configurar Flask-CORS para rechazar cualquier petición que no provenga de los dominios autorizados (tu localhost en desarrollo y Vercel en producción).
*   [ ] **Manejador Global de Errores:** Centralizar las respuestas de fallo en `backend/app/utils/error_handlers.py` para asegurar que la API siempre responda en formato JSON limpio ante excepciones (404, 500, 400).
*   [ ] **Filtro de Seguridad (Auth Middleware):** Desarrollar el decorador personalizado en Python que intercepte los headers HTTP, extraiga el token JWT enviado por el cliente, lo decodifique matemáticamente y verifique si el usuario está autenticado en Supabase.
*   [ ] **Capas de Validación (Schemas):** Implementar estructuras de validación (usando Marshmallow o Pydantic) para asegurar que los datos entrantes contengan los formatos correctos (ej. cédulas válidas, correos bien estructurados, fechas lógicas).

---

## Fase 3: Backend Core, Lógica de Negocio y Pruebas
Aquí programaremos el cerebro matemático del sistema: el procesamiento de partidos y estadísticas.

*   [ ] **Documentación del Contrato:** Diseñar la especificación de la API (Swagger o colección de Postman) en `backend/docs/` para saber exactamente qué rutas usará el frontend.
*   [ ] **Endpoints CRUD Básicos:** Desarrollar las rutas de lectura y escritura para `Torneos`, `Categorías` y `Equipos`.
*   [ ] **Módulo de Inyecciones (Seeders):** Escribir scripts en Python para poblar masivamente la base de datos con información simulada (equipos ficticios, jugadores de prueba).
*   [ ] **Motor Estadístico (Lógica Dura):** Desarrollar la lógica en `backend/app/services/` que procese el marcador de un partido finalizado (ingresado manualmente por el Admin desde un formulario) y actualice automáticamente la tabla de posiciones calculando: partidos jugados, ganados, perdidos, puntos a favor, puntos en contra y desempates.
*   [ ] **Pruebas Automatizadas:** Escribir tests unitarios e integrados con `pytest` en `backend/tests/` para corroborar que la matemática de los puntos y clasificaciones sea matemática pura y libre de errores.

---

## Fase 4: Integración de Almacenamiento S3 (Archivos)
Configuración para procesar y alojar de forma segura la documentación física y visual del torneo.

*   [ ] **Conexión de Almacenamiento:** Configurar la librería de comunicación (ej. `boto3`) con las llaves de acceso del Storage S3 de Supabase.
*   [ ] **Endpoints de Carga:** Crear las rutas de backend especializadas en recibir archivos binarios (Imágenes y PDFs).
*   [ ] **Filtros de Archivos:** Programar restricciones estrictas en Flask que verifiquen el tamaño máximo del archivo (ej. máximo 2MB) y las extensiones permitidas (`.jpg`, `.jpeg`, `.pdf`).
*   [ ] **Persistencia de Rutas:** Asegurar que tras subir exitosamente la foto al bucket, el backend guarde la URL pública final en la fila correspondiente del jugador o equipo en PostgreSQL.

---

## Fase 5: Frontend Base y Autenticación con Supabase
Pasamos al desarrollo de la interfaz de usuario en React, conectando el login directamente con el proveedor de identidad.

*   [ ] **Inicialización del Frontend:** Levantar el proyecto con Vite + TailwindCSS (última versión estable) y configurar las rutas del lado del cliente (`react-router-dom`).
*   [ ] **Cliente Supabase:** Inicializar el SDK de Supabase en `frontend/src/services/supabaseClient.js` usando las llaves públicas anónimas.
*   [ ] **Estado Global de Sesión:** Implementar `AuthContext.jsx` para monitorear en tiempo real si hay un usuario logueado, controlando las redirecciones automáticas.
*   [ ] **Vistas de Autenticación:** Diseñar las interfaces de Login, Recuperación de Contraseña (envío de correo) y actualización de credenciales.
*   [ ] **Interceptor de API:** Configurar Axios o Fetch en `frontend/src/services/api.js` para que detecte el JWT de Supabase en el navegador y lo inyecte automáticamente en el Header `Authorization` en cada llamado que se le haga a Flask.

---

## Fase 6: Paneles de Control y Conexión Total (UI/UX)
Diseño de los flujos de trabajo en pantalla para los delegados y administradores.

*   [ ] **Vistas Públicas:** Programar la página de inicio (Landing), el carrusel de auspiciantes, el fixture de partidos y la visualización de la tabla de posiciones en vivo.
*   [ ] **Panel del Delegado (Inscripciones):** Diseñar el formulario dinámico multipaso para que un delegado registre su equipo, cargue el logo, agregue la nómina de jugadores con sus respectivas fotos y PDFs de las cédulas.
*   [ ] **Panel del Administrador:** Desarrollar la interfaz para aprobar/rechazar jugadores con comentarios, crear nuevas jornadas y un módulo de "Mesa de Control" simplificado para ingresar los marcadores de los partidos.
*   [ ] **Pruebas de Componentes:** Escribir pruebas básicas en el frontend para asegurar que los componentes críticos (como las tablas de posiciones y formularios) rendericen los datos correctamente.

---

## Fase 7: Pruebas de Integración de Extremo a Extremo (E2E) y Despliegue
Fase final de control de calidad y puesta en marcha en los servidores de producción.

*   [ ] **Simulación Completa (E2E):** Realizar una prueba completa del sistema: registrar un usuario -> loguearse -> inscribir equipo con fotos -> aprobarlo como admin -> simular partido -> verificar reflejo inmediato en la tabla de posiciones pública.
*   [ ] **Despliegue del Frontend:** Conectar el repositorio a Vercel, configurar las variables de entorno de producción (`VITE_API_URL`, etc.) y lanzar la UI.
*   [ ] **Despliegue del Backend:** Conectar el repositorio a Render.com, inyectar la cadena de conexión de producción de Supabase en las variables de entorno y lanzar el servidor con Gunicorn.
*   [ ] **Auditoría Final:** Validar el comportamiento de las respuestas CORS en producción y asegurar que el flujo de correos de recuperación de Supabase funcione apuntando al dominio definitivo de Vercel.