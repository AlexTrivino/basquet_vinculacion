# Fase 1 · Tareas

- [x] `specs/01-shared-backend`: spec, plan y tareas.
- [x] DDL de los modelos guardado antes de mover nada. Comprobación: 14 tablas.
- [x] `git mv` a `app/shared` y reexportaciones en las rutas viejas. Comprobación: `pytest` en verde sin tocar las pruebas.
- [x] Imports de `app/` reescritos a `app/shared` y `test_app_importa_desde_shared`. Comprobación: la prueba pasa y falla con un `from app.models import Torneo` en una ruta.
- [x] Errores de dominio y su traducción a HTTP. Comprobación: `tests/test_errores_de_dominio.py`.
- [x] DDL idéntico, contrato sin regrabar, `pytest`, `npm test` y `npm run build` en verde; commit en Windows; fase 1 marcada en el plan; README y `.agents/AGENTS.md` con la carpeta `shared`.
