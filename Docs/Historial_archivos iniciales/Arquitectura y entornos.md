# Enfoque híbrido

## 1. Stack Tecnológico
* **Frontend (UI/UX):** React configurado con Vite + TailwindCSS (última versión estable).
* **Backend (Lógica de Negocio):** Python con el microframework Flask.
* **BaaS (Backend as a Service):** Supabase (PostgreSQL, Storage S3, GoTrue Auth).

## 2. Flujo Híbrido de Datos y Seguridad
El proyecto utiliza una arquitectura desacoplada donde los roles están estrictamente definidos:
1.  **Gestión de Usuarios (Supabase Auth):** El Frontend de React se comunica *directamente* con Supabase para el Login, Registro y Recuperación de contraseña por correo electrónico. *Nota: La tabla `Usuarios` en PostgreSQL NO almacena contraseñas; el campo fue eliminado del modelo para cumplir RNF-SEG-01.*
2.  **Tokens (JWT):** Una vez que el usuario inicia sesión con éxito, Supabase le entrega un token JWT al navegador (React).
3.  **Lógica Dura (Flask):** Cuando React necesita registrar un partido, calcular estadísticas o aprobar un equipo, envía una petición HTTP a la API de Flask adjuntando el token JWT.
4.  **Operaciones de Base de Datos:** Flask recibe la petición, verifica que el token JWT sea válido, ejecuta la matemática compleja (ej. recálculo de posiciones) y actualiza las tablas directamente en la base de datos de Supabase usando SQLAlchemy.

## 3. Entorno de Desarrollo (Local)
Optimizado para iteraciones rápidas y control total desde el sistema operativo de desarrollo.
* **Frontend:** Servidor de desarrollo corriendo en `localhost:5173`.
* **Backend:** API de Flask corriendo en `localhost:5000`.
* **BaaS:** Conexión remota a la base de datos y al *bucket* de desarrollo en Supabase a través de variables de entorno (`.env`).

## 4. Entorno de Producción (MVP y Final)
Arquitectura *Serverless* y *PaaS* diseñada para alta disponibilidad y costo inicial $0.
* **Frontend (Vercel):** Despliegues automáticos desde la rama principal del repositorio. Consume la URL pública de la API.
* **Backend (Render.com):** Ejecuta la API de Flask mediante `gunicorn`. Actúa como el motor de cálculo y validación entre Vercel y Supabase.
* **Base de Datos y Almacenamiento (Supabase):** Aloja el motor PostgreSQL, maneja el envío de correos de recuperación y almacena los archivos estáticos (PDFs y Logos) en sus Buckets S3.