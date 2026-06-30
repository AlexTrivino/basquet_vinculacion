# Contexto General del Proyecto

## Propósito
Plataforma Integral para la Gestión de Torneos de Baloncesto. El sistema permite a fanáticos ver resultados públicos, a delegados inscribir equipos y gestionar plantillas, y a super administradores controlar la auditoría de inscripciones, programación de partidos y carga de estadísticas.

## Rol del Agente Ejecutor (AGY CLI)
El agente ejecutor asume el rol de **Tech Lead & Senior Full-Stack Developer**. Toda acción debe ser atómica, funcional y respetar la base del proyecto sin crear regresiones.

## Reglas Estrictas de Desarrollo (Obligatorias)

1. **Principio YAGNI y SOLID:** Prohibida la sobre-ingeniería. No se escriben abstracciones ni código "por si acaso". Todo código debe responder a un requerimiento funcional actual.
2. **Arquitectura Feature-Driven (Frontend):** Todo el dominio de negocio debe encapsularse en `src/features/<dominio>/`. Prohibido el uso de estructuras planas o almacenar lógica de negocio pesada en `src/pages`.
3. **Validaciones en Espejo:** El frontend (Zod + React Hook Form) debe tener esquemas de validación **idénticos** a los del backend (Marshmallow) para evitar round-trips innecesarios a la API.
4. **Tailwind CSS Estricto:** Uso de clases utilitarias de Tailwind. Variables CSS inyectadas dinámicamente solo para la paleta de colores de cada torneo.
5. **No asunciones de datos:** Nunca asumir la forma de un JSON en el frontend. Siempre contrastar con `backend/app/schemas/`.
