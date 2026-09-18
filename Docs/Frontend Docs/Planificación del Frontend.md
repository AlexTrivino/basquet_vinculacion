# Planificación y Diseño del Frontend: Plataforma Torneos Salesianos

**Enfoque:** Arquitectura Orientada a Componentes (React + Vite + TailwindCSS)

Este documento define la arquitectura visual y la estructura de interfaces de la plataforma.

## 1. Aplicación de los 4 Principios Fundamentales

- **Accesibilidad:** Tablas y calendarios con etiquetas ARIA `aria-label` y `scope`. Navegación por teclado en formularios.
- **Rendimiento y Optimización:**
    - **Skeletons y Spinners:** Indicadores de carga no bloqueantes para enmascarar latencia de red. (El proyecto ya no corre en Render, por lo que el cold start no es un problema crítico, pero la práctica se mantiene).
    - **Compresión Cliente-Servidor:** (Planificado/Pendiente) Interceptar subida de imágenes para comprimirlas antes de enviarlas a S3.
    - **Paginación:** Carga paginada consumiendo la metadata del backend (`page`, `per_page`, `total`).
- **Mantenibilidad y Escalabilidad:** TypeScript estricto. Conexión centralizada vía `src/api/axios.config.ts`.
- **Experiencia de Usuario (UX/UI):**
    - **Mobile-First:** Contenedores con `overflow-x-auto` para tablas de datos.
    - **Toast Notifications:** Uso de Sonner para traducir errores crudos de la API a lenguaje natural.
    - **Prevención de Doble Envío:** Botones de acción se bloquean asíncronamente en cualquier petición POST/PUT.

## 2. Estructura de Dominio (Features)

Las funcionalidades están mapeadas a dominios de negocio específicos en `src/features/`:
- `auth`: Autenticación y recuperación de sesión.
- `equipos` e `inscripciones`: Wizard de registro y reinscripción automática de clubes.
- `jugadores` y `plantillas`: Gestión estricta de roster de equipos.
- `torneos`, `categorias` y `partidos`: Calendario público, fixture y configuración admin.
- `estadisticas`: Carga en lote de box scores y métricas.
- `sanciones` y `patrocinadores`: Gestión y control complementario.

## 3. Mapa de Rutas y Vistas (React Router)

|**Módulo**|**Ruta Base**|**Rol Requerido**|**Descripción**|
|---|---|---|---|
|**Público**|`/`|Público|Landing page con banner, carrusel de auspiciantes y torneos activos.|
|**Público**|`/torneos/:id`|Público|Vista detallada: Posiciones, Calendario, Líderes estadísticos.|
|**Auth**|`/auth/login`|Público|Inicio de sesión con correo y contraseña (Supabase).|
|**Auth**|`/auth/recuperar`|Público|Solicitud de restablecimiento de contraseña.|
|**Delegados**|`/delegado/dashboard`|Delegado|Panel de control y estado de inscripciones.|
|**Delegados**|`/delegado/inscripcion`|Delegado|Wizard de inscripción, reinscripción y comprobantes.|
|**Delegados**|`/delegado/plantilla`|Delegado|Gestor de roster: agregar jugadores y documentos.|
|**Admin**|`/admin/dashboard`|Super Admin|Métricas y resumen de inscripciones pendientes.|
|**Admin**|`/admin/auditoria`|Super Admin|Visor dual para aprobar/rechazar inscripciones.|
|**Admin**|`/admin/partidos`|Super Admin|Programación de calendario y fases.|
|**Admin**|`/admin/estadisticas`|Super Admin|Carga masiva (bulk) de resultados post-partido.|

## 4. Reglas de Negocio Clave en Interfaz

1. **Gestión de Plantillas (Delegados):**
   - **Regla Estricta:** La interfaz de gestión de plantilla solo se habilita si la inscripción del equipo se encuentra en estado **Aprobado**. Si está pendiente, se bloquea la carga de jugadores (corrige diseño anterior que permitía cargar en pendiente).
2. **Límites Físicos:**
   - Mínimo de 10 y máximo de 18 jugadores por equipo según reglamento.
3. **Validación en Espejo:**
   - Zod refleja los mismos límites numéricos (ej. máximo 6 faltas) y de longitud de caracteres que exige Marshmallow en el backend para dar validación instantánea.

## 5. Biblioteca de Componentes Base (UI Kit)

Componentes reutilizables implementados en `src/components/`:
1. **`DataGridTable`:** Componente de tabla responsiva con scroll y paginación.
2. **`FileUploadButton`:** Botón inteligente de subida de archivos restrictivo por MIME y tamaño.
3. **`AsyncButton`:** Intercepta `onClick` asíncronos y maneja estados de *loading* inyectando spinners.
4. **`StatusBadge`:** Componentes pill de colores para estados (Pendiente, Aprobado, Finalizado, etc.).
