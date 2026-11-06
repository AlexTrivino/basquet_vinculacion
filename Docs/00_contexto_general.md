# Contexto General del Proyecto

## Propósito
Plataforma integral para la gestión de torneos de baloncesto del campeonato de exalumnos de Manabí (Torneos Baloncesto Manta). El sistema permite a:
- **Fanáticos/Público:** Ver resultados, posiciones, calendario y estadísticas de los torneos en tiempo real.
- **Delegados:** Inscribir equipos, gestionar plantillas de jugadores y subir documentación.
- **Super Administradores:** Auditar inscripciones, programar partidos, registrar estadísticas y generar reportes FIBA.

## Proyecto de Vinculación
Desarrollado como parte del programa de vinculación con la comunidad de la Universidad Laica Eloy Alfaro de Manabí (ULEAM).

---

## Principios de Desarrollo

1. **YAGNI y SOLID:** Prohibida la sobre-ingeniería. Todo código responde a un requerimiento funcional real.
2. **Screaming Architecture (Frontend):** Cada pantalla vive en el módulo de negocio al que pertenece (`src/modules/<módulo>/`, con su `api/`, `components/`, `pages/` y `routes.tsx`); de afuera se entra solo por su `index.ts`. `src/app/` arma la aplicación y `src/shared/` tiene lo que no es de ningún negocio. Ver `specs/` y `src/fronteras.test.ts`.
3. **Validaciones en Espejo:** Los esquemas de validación del frontend (Zod) deben ser idénticos a los del backend (Marshmallow).
4. **No Asumir Datos:** Nunca asumir la forma de un JSON. Siempre contrastar con los esquemas del módulo (`backend/app/modules/<módulo>/http/esquemas.py`) antes de escribir código frontend.
5. **Cero Cambios Destructivos:** El backend tiene protecciones activas contra operaciones destructivas en la base de datos de producción.

## Para Empezar

1. Leer [`02_estado_proyecto.md`](02_estado_proyecto.md) para entender dónde está el proyecto.
2. Leer [`01_arquitectura.md`](01_arquitectura.md) para entender el stack y la autenticación.
3. Revisar la [Referencia de la API](05_Historial_y_Academia/Backend_docs/api_referencia.md) para conocer los endpoints.
4. Consultar el [`README.md`](../README.md) en la raíz para instrucciones de instalación local.
