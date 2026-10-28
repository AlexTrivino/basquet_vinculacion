# Fase 5 · Tareas

- [x] `specs/05-plantel`: spec, plan y tareas.
- [x] 31 casos de contrato nuevos grabados con el código de `7656270`. Comprobación: solo se agregan esas 31 referencias.
- [x] `shared`: `SinPermiso`, `reglas.py`, `textos.py`, `borrar_en_segundo_plano` y el tamaño por defecto de `pagina_pedida`. Comprobación: el contrato no cambia y `test_capas.py` exige las rutas nuevas.
- [x] `domain`, `application` e `infrastructure` del módulo, con `tests/test_plantel.py`. Comprobación: las pruebas pasan sin base de datos.
- [x] `http` registrado en `app/__init__.py`. Comprobación: los 140 casos de contrato del módulo pasan sin regrabar.
- [x] Rutas, servicios y esquemas viejos retirados y `ORM_EN_RUTAS` en 29. Comprobación: `test_capas.py`.
- [x] README y `.agents/AGENTS.md` con el módulo.
- [x] `pytest`, `npm test` y `npm run build` en verde; commit en Windows; fase 5 marcada en el plan.
