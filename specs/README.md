# Especificaciones (SDD)

Los cambios de arquitectura se hacen con Spec-Driven Development: primero la especificación, después el plan y las tareas, y recién entonces el código.

- Plan maestro de la migración (backend a Clean Architecture, frontend a Screaming Architecture): [Plan SDD](https://claude.ai/artifact/XsF9bMiNPae4Lekq55Z3BG).
- Reglas que ninguna tarea puede romper: [constitucion.md](constitucion.md).
- Cada fase tiene su carpeta `NN-nombre/`, que se escribe al empezar la fase:
  - `spec.md`: qué y por qué, con los criterios de aceptación.
  - `plan.md`: cómo, con los archivos que toca.
  - `tasks.md`: tareas chicas, cada una con su comprobación.

| Fase | Carpeta | Estado |
| --- | --- | --- |
| 0 · Red de seguridad | [00-red-de-seguridad](00-red-de-seguridad/spec.md) | terminada |
| 1 · Backend: shared | [01-shared-backend](01-shared-backend/spec.md) | terminada |
| 2 · Backend: auspicios (piloto) | [02-auspicios](02-auspicios/spec.md) | terminada |
| 3 · Backend: competencia | [03-competencia](03-competencia/spec.md) | terminada |
| 4 · Backend: torneos | [04-torneos](04-torneos/spec.md) | terminada |
| 5 · Backend: plantel | [05-plantel](05-plantel/spec.md) | terminada |
| 6 a 8 · Backend por módulos | se crean al empezar cada fase | pendiente |
| 9 y 10 · Frontend por módulos | se crean al empezar cada fase | pendiente |
