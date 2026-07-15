# Planificación Estratégica del Frontend: Plataforma Torneos Salesianos

**Versión:** 1.0

**Enfoque:** Arquitectura Orientada a Componentes (React + Vite + TailwindCSS)

Este documento define la arquitectura visual y la estructura de interfaces de la plataforma, diseñada bajo los estándares de Accesibilidad, Rendimiento, Mantenibilidad y Experiencia de Usuario, alineada estrictamente con los requisitos del backend híbrido.

## 1. Aplicación de los 4 Principios Fundamentales

Para garantizar un producto de calidad, las decisiones de UI/UX se regirán por estas normativas técnicas:

- **Accesibilidad:** Las tablas de posiciones y los calendarios deportivos contendrán etiquetas ARIA `aria-label` y `scope` en los encabezados para lectores de pantalla. La navegación entre formularios largos (como la inscripción de plantillas) será 100% operable mediante la tecla `Tab`.
    
- **Rendimiento y Optimización:**
    
    - **Tolerancia al "Cold Start":** Dado que el backend en Render.com puede tardar hasta 50 segundos en despertar de la inactividad, se implementarán `Skeletons` y `Spinners` no bloqueantes en la primera carga para evitar que el usuario asuma que el sistema falló.
        
    - **Compresión Cliente-Servidor:** Se implementará una utilidad en React que intercepte la subida de fotos de perfil y logos (limitados a 2MB), comprimiéndolos a formato moderno antes de enviarlos a Supabase S3.
        
    - **Paginación:** Todas las vistas de listados que superen los 50 registros implementarán carga paginada consumiendo la metadata del backend.
        
- **Mantenibilidad y Escalabilidad:** El proyecto usará TypeScript estricto. La conexión a la API se centralizará en un cliente de Axios (`src/services/api.js`) que inyectará automáticamente el token JWT de Supabase en los _headers_.
    
- **Experiencia de Usuario (UX/UI):**
    
    - **Mobile-First Crítico:** Las tablas estadísticas con múltiples columnas usarán contenedores con `overflow-x-auto` para ser legibles en celulares sin romper el diseño.
        
    - **Retroalimentación Clara:** Se usarán notificaciones tipo _Toast_ para traducir errores crudos de la API (ej. validaciones de edad o cédulas duplicadas) a lenguaje natural.
        
    - **Bloqueo de Doble Envío:** Los botones de "Guardar" o "Subir Archivo" pasarán a estado _disabled_ y mostrarán un indicador de carga durante el flujo asíncrono.

## 2. Arquitectura Base y Herramientas (Core Architecture)

Antes de construir interfaces, el proyecto debe cimentarse sobre las siguientes capas técnicas para garantizar la escalabilidad:

- **Estructura de Carpetas (Feature-Driven):** Se prohíbe la estructura plana. El proyecto se organizará así:
  - `/src/api`: Instancias de Axios, interceptores y llamadas al backend.
  - `/src/components`: UI Kit genérico (Botones, Modales, Tablas).
  - `/src/context`: Manejo de estado global (AuthContext).
  - `/src/features`: Componentes complejos separados por dominio (ej. `/features/torneos`, `/features/estadisticas`).
  - `/src/pages`: Ensamblaje de vistas que se inyectan en el Router.
  
- **Capa de Red (Networking):**
  - Se creará un cliente Axios global.
  - **Interceptor de Request:** Inyectará automáticamente `Authorization: Bearer <token>` extraído del `localStorage` o de la sesión de Supabase Auth.
  - **Interceptor de Response:** Escuchará errores `401 Unauthorized`. Si el token expira, destruirá la sesión local y redirigirá al usuario a `/auth/login`.

- **Manejo de Formularios y Validación:**
  - Prohibido usar formularios controlados puros con múltiples `useState` para vistas complejas.
  - Se utilizará **React Hook Form** para el rendimiento (evitar re-renders) y **Zod** para validar en el cliente que los datos (ej. cédulas ecuatorianas de 10 dígitos, correos) sean correctos antes de golpear el backend.

- **Manejo de Estado (State Management):**
  - La sesión, el rol (`super_admin` o `delegado`) y el UUID del usuario vivirán en un `AuthContext`.
  - Se crearán componentes HOC (Higher-Order Components) como `<ProtectedRoute allowedRoles={['super_admin']}>` para envolver las rutas en React Router.

## 3. Mapa de Rutas y Vistas (React Router)

La aplicación se dividirá en módulos protegidos por un `AuthContext.jsx` que verificará la sesión directamente con Supabase.

|**Módulo**|**Ruta Base**|**Rol Requerido**|**Descripción**|
|---|---|---|---|
|**Público**|`/`|Público|Landing page con banner, carrusel de auspiciantes y resumen general.|
|**Público**|`/torneos/:id`|Público|Vista detallada de un torneo con pestañas: Posiciones, Calendario, Líderes.|
|**Auth**|`/auth/login`|Público / Invitado|Inicio de sesión con correo y contraseña delegando a Supabase GoTrue.|
|**Auth**|`/auth/recuperar`|Público / Invitado|Solicitud de restablecimiento de contraseña.|
|**Delegados**|`/delegado/dashboard`|Delegado|Panel de control del representante del equipo.|
|**Delegados**|`/delegado/inscripcion`|Delegado|Formulario para registrar el nombre, logo del equipo y comprobante de pago.|
|**Delegados**|`/delegado/plantilla`|Delegado|Gestor de roster: agregar jugadores y subir documentos (Cédula y Certificado individual).|
|**Admin**|`/admin/dashboard`|Super Admin|Resumen de inscripciones pendientes de revisión.|
|**Admin**|`/admin/auditoria`|Super Admin|Interfaz para aprobar/rechazar pagos y documentos de jugadores.|
|**Admin**|`/admin/partidos`|Super Admin|Programación de calendario, horas, fases y ubicación.|
|**Admin**|`/admin/estadisticas`|Super Admin|Formulario manual de inserción de resultados post-partido (puntos, faltas, triples).|

## 4. Desglose y Especificaciones por Interfaz

### 4.1. Interfaz Pública (Fans y Seguidores)

- **Pantalla de Inicio (Home):**
    
    - **Hero Section:** Banner principal destacado.
        
    - **Grid de Torneos:** Tarjetas (_Cards_) visuales indicando el estado del torneo (ej. "En curso", "Inscripciones abiertas").
        
    - **Carrusel de Auspiciantes:** Cinta de logos infinita en la parte inferior.
        
- **Pantalla de Torneo (Tabs UI):**
    
    - _Tab 1 - Tabla en Vivo:_ Tabla de posiciones calculada por el backend basada en diferencia de puntos y overage.
        
    - _Tab 2 - Calendario:_ Lista de partidos filtrable por fecha y fase.
        
    - _Tab 3 - Líderes:_ Podios de jugadores con más puntos, triples y rebotes.
        

### 4.2. Interfaz de Autenticación

- **Pantalla de Login:**
    
    - Formulario limpio con inputs de `email` y `password`.
        
    - Lógica conectada directamente a `supabase.auth.signInWithPassword` para obtener el JWT.
        
    - Manejo de errores específicos (ej. credenciales inválidas).
        

### 4.3. Interfaz del Delegado (Gestión de Equipo)

- **Dashboard Delegado:**
    
    - Estado visual de su inscripción (Pendiente, Aprobado, Rechazado).
        
- **Wizard de Inscripción (Proceso por pasos):**
    
    - _Paso 1:_ Datos del equipo y carga del Logo (compresión automática).
        
    - _Paso 2:_ Carga del comprobante de transferencia bancaria.
        
- **Gestor de Plantilla (Tabla Dinámica):**
    
    - Interfaz para añadir entre 10 y 15 jugadores.
        
    - Por cada fila de jugador, se requerirán modales o secciones desplegables para ingresar datos personales y subir de manera obligatoria la Foto, Cédula en PDF y Certificado.
        
    - _UX Clave:_ Permitir añadir jugadores al instante con estado `'pendiente'` sin que el pago esté aprobado aún.
        

### 4.4. Interfaz del Super Administrador

- **Auditoría y Revisiones:**
    
    - Visor de documentos dividido en dos paneles: a la izquierda la información del equipo/jugador, a la derecha un previsualizador del PDF (Comprobante o Cédula).
        
    - Botones de acción rápida: "Aprobar" (Verde) / "Rechazar" (Rojo con input para motivo).
        
- **Consola de Estadísticas (Mesa de Control):**
    
    - Interfaz optimizada para la carga rápida de datos pos-partido.
        
    - Dos columnas (Equipo Local vs Equipo Visitante).
        
    - Inputs numéricos validados para puntos, faltas, triples por cada jugador habilitado para ese encuentro.
        
    - Botón de "Finalizar Partido" que dispara el envío masivo (Bulk Insert) al backend.
        

## 5. Biblioteca de Componentes Base (UI Kit)

Para mantener la consistencia visual y acelerar el desarrollo, se construirán los siguientes componentes reutilizables en `src/components/`:

1. **`DataGridTable`:** Componente de tabla responsiva (con _scroll_ horizontal seguro) para la visualización de datos masivos.
    
2. **`FileUploadButton`:** Botón inteligente que restringe tipos MIME (`.jpg`, `.pdf`) e integra la lógica de compresión de imágenes antes de llamar al servicio de S3.
    
3. **`AsyncButton`:** Botón que intercepta eventos `onClick` asíncronos y cambia su estado interno a _loading_ (spinner) automáticamente.
    
4. **`StatusBadge`:** Etiquetas de colores (`Pill`) para unificar la representación de estados (`Pendiente`, `Aprobado`, `Activo`, `Inactivo`).