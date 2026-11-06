# Fase 8 · Tareas

- [x] `specs/08-identidad-y-cierre`: spec, plan y tareas.
- [x] 4 casos de contrato nuevos grabados con el código de `e69eac6`. Comprobación: solo se agregan esas 4 referencias.
- [x] `app/modules/identidad` con sus cuatro capas y `tests/test_identidad.py`. Comprobación: las pruebas pasan sin base de datos.
- [x] `/api/health` y `/api/config/reglas-negocio` en `app/shared/http`, todo registrado en `app/__init__.py`. Comprobación: los 15 casos de contrato pasan sin regrabar.
- [x] `app/routes`, `app/models` y `app/utils` borrados, y pruebas y scripts importando de `app.shared`. Comprobación: ningún import viejo en el repositorio, los scripts compilan y lo que importan existe.
- [x] `test_capas.py` estricta para todo `app/`. Comprobación: falla con un archivo suelto en `app/utils`, `app/routes`, la raíz de un módulo o la de `shared`.
- [x] README, `backend/README.md`, `.agents/AGENTS.md`, la guía de desarrollo y la skill de backend con la estructura final.
- [x] `pytest`, `npm test` y `npm run build` en verde; commit en Windows; fase 8 marcada en el plan.
