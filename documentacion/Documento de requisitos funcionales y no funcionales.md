**Proyecto:** Plataforma de Gestión de Torneos - Exalumnos Salesianos de Manta  
**Versión:** 1.0  
**Arquitectura:** Híbrida Desacoplada (React + Flask + Supabase)
# Requisitos funcionales (DRF)
---

## 1. Información General del Proyecto
El objetivo del sistema es la reforma integral visual y funcional de la gestión de torneos de baloncesto organizados por los Exalumnos Salesianos de Manta. La plataforma automatizará el registro de equipos, la validación de documentos, y el cálculo de estadísticas y tablas de posiciones, reemplazando el uso de formularios manuales de Google.

**Alcance de Volumen:** El torneo principal albergará un máximo de 35 equipos y más de 400 jugadores.

---

## 2. Roles y Permisos del Sistema
El sistema aplicará el Principio de Menor Privilegio mediante tres roles claramente definidos:

1.  **Super Admin:** Control total de la plataforma. Encargado de crear torneos, aprobar/rechazar inscripciones y documentos, y gestionar el calendario de partidos y resultados.
2.  **Delegado:** Representante de un equipo. Solo puede gestionar el registro de su equipo, realizar el pago, y administrar la nómina de sus jugadores asociados.
3.  **Público:** Usuario no autenticado. Solo tiene permisos de lectura para visualizar torneos, calendarios, tablas de posiciones y estadísticas.

---

## 3. Reglas de Negocio Estrictas (Business Rules)
El backend en Flask debe garantizar el cumplimiento de las siguientes reglas matemáticas y lógicas:

* **Puntuación de Partidos:** En el baloncesto no hay empates. El equipo ganador recibe 2 puntos y el equipo perdedor recibe 1 punto.
* **Desempates en Tablas:** Se resolverán mediante la diferencia de goles/canastas y el cálculo del "overage" (promedio de puntos por juego).
* **Formatos de Torneo:** El sistema debe soportar fases de grupos o todos contra todos, siempre culminando en rondas eliminatorias directas (playoffs).
* **Categorías y Edades:** Las categorías habilitadas (Masculino y Femenino) son: Juvenil/Senior (abierto), +30 años (ej. nacidos desde 1996 hacia atrás), +40 años (nacidos desde 1986 hacia atrás) y +50 años. *El sistema calculará y validará la edad del jugador automáticamente a partir de su fecha de nacimiento.*
* **Límites de Plantilla:** Cada equipo debe registrar un mínimo de 10 jugadores y un máximo de 15 por plantilla (inferido del límite de campos del formulario original).
* **Borrado Lógico:** No se permiten eliminaciones físicas (Cascade Deletes) de equipos o jugadores. Toda eliminación cambiará el atributo `estado` a "inactivo" para mantener el historial estadístico.

---

## 4. Requisitos Funcionales por Módulo

### 4.1. Módulo Público (Landing Page y Visualización)
* **RF-PUB-01 (Banner Principal):** La página principal debe mostrar los torneos activos, próximos partidos e información destacada con diseño deportivo.
* **RF-PUB-02 (Sección de Torneos):** Se mostrarán los torneos en formato "Cards" detallando el logo, categoría y estado actual.
* **RF-PUB-03 (Tablas en Vivo):** Los usuarios podrán visualizar la tabla de posiciones actualizada en tiempo real, calculada en base a los resultados ingresados en el backend.
* **RF-PUB-04 (Líderes Estadísticos):** Se mostrará un ranking de jugadores destacados (Puntos, Triples, Rebotes).
* **RF-PUB-05 (Auspiciantes):** La plataforma integrará un carrusel dinámico automático con los logos de los patrocinadores.

### 4.2. Módulo de Autenticación
* **RF-AUTH-01 (Registro y Login):** Los delegados podrán registrarse e iniciar sesión utilizando su correo y contraseña a través del servicio gestionado de Supabase Auth.
* **RF-AUTH-02 (Recuperación de Acceso):** Supabase enviará correos automáticos con tokens seguros para la recuperación de contraseñas de los delegados.

### 4.3. Módulo del Delegado (Inscripción de Equipos)
* **RF-DEL-01 (Registro de Equipo):** El delegado llenará un formulario indicando el Nombre del equipo, Categoría, Logo del equipo (archivo gráfico) y subirá el Comprobante de Depósito (PDF/Imagen). La inscripción se registra con estado `'pendiente'` hasta la aprobación del Admin.
* **RF-DEL-02 (Gestión de Plantilla):** Tras registrar el equipo, el delegado podrá agregar jugadores inmediatamente **sin esperar la aprobación del comprobante de pago**. Tanto el equipo como los jugadores ingresan con estado `'pendiente'`. El Admin revisará el pago y los jugadores en un solo flujo de aprobación.
* **RF-DEL-03 (Datos del Jugador):** Por cada jugador se requerirá: Nombres, Apellidos, Número de Camiseta, Documento de Identidad (Cédula/Pasaporte), Fecha de Nacimiento y Foto de Perfil.
* **RF-DEL-04 (Carga de Documentos Individuales):** A diferencia del modelo antiguo, el delegado subirá la Cédula (PDF) y el Certificado de Estudios/Bachiller (PDF) de manera individual atada al registro de cada jugador específico, no como un solo bloque.

### 4.4. Módulo del Administrador (Super Admin)
* **RF-ADM-01 (Auditoría de Pagos):** El administrador revisará los comprobantes de depósito y cambiará el estado de la inscripción a "Aprobado" o "Rechazado".
* **RF-ADM-02 (Validación de Jugadores):** Revisará visualmente los PDF (Cédula y Certificado) de cada jugador y podrá habilitarlo o bloquearlo si la documentación es inválida.
* **RF-ADM-03 (Gestión de Partidos):** Programará la fecha, hora y fase de los encuentros (usando ubicaciones fijas como "Coliseo Pablo Delgado Álava").
* **RF-ADM-04 (Ingreso de Estadísticas):** El administrador utilizará un formulario manual en la plataforma para asentar los resultados y estadísticas detalladas por jugador (puntos, rebotes, triples, asistencias) para alimentar el motor matemático. *Decisión MVP: Se descarta el parsing automático de PDFs/CSVs de FIBA LiveStats en favor de la robustez y confiabilidad del ingreso manual.*

---

## 5. Requisitos No Funcionales (RNF)

* **RNF-01 (Arquitectura Base):** El Frontend se desarrollará en React/Vite (desplegado en Vercel) y el Backend en Python/Flask (desplegado en Render).
* **RNF-02 (Seguridad JWT):** Toda petición de modificación a la base de datos deberá incluir un JSON Web Token (JWT) válido en los Headers, el cual será verificado por un middleware en Flask.
* **RNF-03 (Base de Datos):** Se utilizará PostgreSQL gestionado por Supabase, comunicándose a través de un ORM (SQLAlchemy) en el backend.
* **RNF-04 (Almacenamiento S3):** Los archivos (Logos, Fotos de perfil, PDFs de cédulas y certificados) se almacenarán en los Buckets Storage de Supabase. El sistema guardará únicamente las URLs públicas generadas en la base de datos relacional.
* **RNF-05 (Validación de Archivos):** El backend de Flask limitará el tamaño de las subidas (ej. máx 2MB por imagen) y validará extensiones (.jpg, .jpeg, .pdf) para no saturar el almacenamiento.
* **RNF-06 (Experiencia Móvil - Responsive):** La interfaz visual (especialmente los resultados, horarios y tablas) debe ser "Mobile-first", priorizando su perfecta visualización en teléfonos celulares.

---

## 6. Modelado de Datos de Referencia
El sistema gestionará las siguientes entidades principales atadas por llaves foráneas estrictas y cardinalidades definidas:
* `Usuarios` (con llave primaria UUID)
* `Torneos`, `Categorias`, `Equipos`, `Jugadores`
* Tablas Pivote/Transaccionales: `Inscripciones`, `Plantillas`, `Partidos`
* Gestión de Archivos: `Documentacion` (General del Torneo), `Documentos_Jugadores`
* Tablas de Análisis: `Estadisticas`, `Sanciones`
---

# Requisitos no funcionales (DRNF)
---

## 1. Rendimiento y Escalabilidad (Performance)

* **RNF-REN-01 (Tiempos de Respuesta Base):** Las peticiones a la API para lectura de datos públicos (ej. tabla de posiciones, lista de partidos) deben resolverse en menos de 800 milisegundos bajo condiciones normales de red.
* **RNF-REN-02 (Manejo de "Cold Start" en Render):** Debido a la infraestructura *Serverless/Free Tier* del backend, el sistema de frontend en React debe implementar indicadores de carga (Loaders/Spinners) amigables. El sistema debe tolerar un tiempo máximo de espera de 50 segundos en la primera petición del día mientras el servidor "despierta", sin arrojar errores de *Timeout*.
* **RNF-REN-03 (Paginación de Datos):** Para garantizar la escalabilidad cuando el volumen de jugadores y partidos históricos crezca, todos los endpoints que devuelvan listas de registros (ej. `GET /api/jugadores`) deben implementar paginación obligatoria desde el backend a partir de los 50 registros.
* **RNF-REN-04 (Optimización de Imágenes):** El frontend debe comprimir las imágenes (fotos de perfil y logos) en el navegador del cliente antes de enviarlas al backend, reduciendo la carga de red y optimizando el espacio en el *bucket* S3.

---

## 2. Seguridad y Privacidad (Security)

* **RNF-SEG-01 (Autenticación Desacoplada):** Las credenciales de los usuarios (contraseñas) no deben tocar ni ser procesadas por el servidor de Flask. El manejo de identidad, encriptación y correos de recuperación se delegará exclusivamente a Supabase Auth.
* **RNF-SEG-02 (Validación de Tokens JWT):** Todo endpoint de Flask que implique escritura, modificación o eliminación de datos debe requerir un token JWT en el header `Authorization: Bearer <token>`. El servidor debe validar matemáticamente la firma del token antes de procesar la petición.
* **RNF-SEG-03 (Políticas CORS Restrictivas):** El backend en Flask debe tener configurado el *Cross-Origin Resource Sharing* (CORS) de forma estricta. En el entorno de producción, solo se aceptarán peticiones HTTP provenientes del dominio oficial del frontend en Vercel.
* **RNF-SEG-04 (Protección de Base de Datos):** La conexión a PostgreSQL desde Flask debe realizarse exclusivamente a través de variables de entorno inyectadas en el servidor, las cuales jamás deben ser expuestas en el código fuente ni subidas al repositorio de GitHub.
* **RNF-SEG-05 (Defensa contra Inyecciones SQL):** Absolutamente todas las consultas a la base de datos deben realizarse a través del ORM de SQLAlchemy. Queda estrictamente prohibido concatenar cadenas de texto para ejecutar SQL puro.

---

## 3. Almacenamiento y Gestión de Archivos (Storage)

* **RNF-ALM-01 (Límites de Peso por Archivo):** Para proteger la cuota de 1 GB del nivel gratuito de Supabase, el backend debe rechazar peticiones con archivos que superen los siguientes límites:
  * Fotos de perfil / Logos: Máximo 2 MB por archivo.
  * Documentos PDF (Cédulas, Certificados, Planillas FIBA): Máximo 5 MB por archivo.
* **RNF-ALM-02 (Filtro de Extensiones):** El backend aplicará un control estricto de tipo de archivo (MIME Type verification). Solo se aceptarán formatos `.jpg`, `.jpeg`, `.png`, `.webp` para imágenes, y `.pdf` para documentación formal.
* **RNF-ALM-03 (Nomenclatura Estandarizada):** Antes de subir un archivo a Supabase S3, el backend renombrará automáticamente el archivo usando UUIDs o marcas de tiempo (ej. `equipo_uuid_logo.png`) para evitar la sobrescritura accidental por nombres de archivo duplicados (ej. `foto.jpg`).

---

## 4. Usabilidad y Accesibilidad (Usability)

* **RNF-USA-01 (Diseño Mobile-First):** La interfaz gráfica debe estar optimizada en primera instancia para dispositivos móviles, garantizando que elementos críticos (como la tabla de posiciones con múltiples columnas y los calendarios) sean legibles sin necesidad de hacer *zoom in*.
* **RNF-USA-02 (Manejo de Errores en UI):** Ante cualquier fallo del backend (ej. intento de registro con cédula duplicada), el frontend debe mostrar notificaciones "Toast" amigables y legibles para un usuario no técnico. Queda prohibido mostrar mensajes de error crudos de la base de datos.
* **RNF-USA-03 (Flujo Asíncrono):** Durante la carga múltiple de datos (ej. inscripción de un equipo y sus jugadores), la interfaz debe bloquear los botones de envío (estado *disabled*) para prevenir que el usuario de doble clic y genere registros duplicados.

---

## 5. Mantenibilidad, Calidad de Código y Entornos

* **RNF-MAN-01 (Formateo y Estilos Estandarizados):** El código debe cumplir con las normativas de estilo internacionales. Se utilizará `Flake8` o `Black` para mantener el código Python limpio, y `ESLint` + `Prettier` para el código React. El CI/CD bloqueará cualquier despliegue que no cumpla con estas reglas.
* **RNF-MAN-02 (Respuestas JSON Uniformes):** Todas las respuestas del backend (tanto exitosas como de error) deben seguir una estructura JSON estandarizada para facilitar el consumo del frontend. Ejemplo de error: `{"success": false, "error_code": "VALIDATION_ERROR", "message": "El jugador es menor a la edad permitida."}`.
* **RNF-MAN-03 (Entorno Local Nativo):** El sistema debe ser capaz de levantarse en un entorno local nativo de desarrollo bajo Windows 11 o distribuciones de Linux sin depender obligatoriamente de Docker para la API, utilizando entornos virtuales de Python (`venv`).
* **RNF-MAN-04 (Gestión de Migraciones):** Toda alteración estructural en la base de datos (crear tablas, agregar columnas, cambiar tipos de datos) debe realizarse a través de archivos de migración autogenerados por `Flask-Migrate` (Alembic). No se realizarán cambios estructurales directamente en la consola de Supabase.
* **RNF-MAN-05 (Documentación Viva):** Las especificaciones de los endpoints de la API deben mantenerse documentadas en formato OpenAPI (Swagger) o como una Colección exportable de Postman adjunta en el repositorio, garantizando que el contrato entre frontend y backend sea siempre claro.

---

## 7. Decisiones Arquitectónicas Ratificadas

Las siguientes decisiones fueron validadas tras la revisión arquitectónica inicial y rigen el desarrollo del MVP:

1. **Sin campo `contrasenia` en `Usuarios`:** La tabla NO almacena contraseñas. La autenticación se delega 100% a Supabase Auth (GoTrue). El `id_usuario` (UUID) es el único enlace.
2. **Categorías como Seeders Estáticos:** Las categorías son datos semilla insertados por migración. Solo requieren endpoint de lectura (`GET`). Incluyen campos `edad_minima` y `edad_maxima` para validación dinámica.
3. **Validación de Partidos en Capa de Servicios:** La verificación de que ambos equipos estén inscritos y aprobados se implementa en Flask (`services/`), no mediante FKs adicionales en `Partidos`.
4. **Campo `ubicacion` en `Partidos`:** Valor por defecto `'Coliseo Pablo Delgado Álava'` a nivel de BD para escalabilidad futura.
5. **Estadísticas Manuales (MVP):** Ingreso manual mediante formulario del Admin. Se descarta parsing de PDFs/CSVs de FIBA LiveStats.
6. **Soft Delete en `Plantillas`:** Campo `estado` agregado para consistencia con el borrado lógico del resto de entidades.
7. **Inscripción Sin Bloqueo:** El delegado registra equipo y jugadores inmediatamente. Todo ingresa con estado `'pendiente'`. El Admin aprueba/rechaza el conjunto.
8. **Campos de Edad en `Categorias`:** `edad_minima` (Integer, Default=0) y `edad_maxima` (Integer, Nullable) eliminan Magic Numbers en validaciones.
9. **Frontend con TailwindCSS:** Última versión estable compatible con Vite.