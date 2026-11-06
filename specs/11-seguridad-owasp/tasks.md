# Fase 11 · Tareas

- [x] Revisión: backend, frontend, scripts y dependencias (`pip-audit`, `npm audit`), con el informe en [informe.md](informe.md).
- [x] Archivos del bucket: sin `url_*` en el alta y la edición de jugadores y `borrar_archivo` solo con claves del bucket. Comprobación: `test_seguridad.py` y dos casos de contrato.
- [x] Inscripciones: el delegado solo inscribe y reinscribe equipos suyos; la inscripción completa revisa el torneo. Comprobación: tres casos de contrato.
- [x] Datos personales por cédula y el teléfono al vincular un jugador en la plantilla. Comprobación: tres casos de contrato y `GestorPlantillaTelefono.test.ts`.
- [x] `/api/usuarios/me` con cuenta activa y nombre de 1 a 100 caracteres; el login muestra el mensaje del backend. Comprobación: cuatro casos de contrato.
- [x] JWT, planilla, errores HTTP, `isdecimal()`, cabeceras y registro de rechazos. Comprobación: `test_seguridad.py` y un caso de contrato.
- [x] Scripts con confirmación y seed sin contraseñas escritas. Comprobación: `test_seguridad.py`.
- [x] Dependencias: `pip-audit` y `npm audit` sin hallazgos; `deploy.sh` con `npm ci`. Comprobación: `pytest` en Python 3.12 y 3.13 (661), `npm test` (83), build y prueba de humo igual a la base.
- [x] README, `.agents/AGENTS.md` y `specs/README.md`.
