# Fase 0 · Tareas

- [x] `specs/`: README, constitución y esta fase.
- [x] `backend/tests/contrato/datos.py`: base de contrato con ids fijos. Comprobación: siembra sin errores en SQLite.
- [x] `backend/tests/contrato/casos.py`: casos de las 86 rutas, con 401 y 403 donde corresponde. Comprobación: `test_todas_las_rutas_tienen_caso`.
- [x] `backend/tests/contrato/test_contrato.py` y `referencias.json` grabadas con el código de `fe47e53`. Comprobación: `pytest tests/contrato` en verde dos veces seguidas.
- [x] `backend/tests/test_capas.py`. Comprobación: pasa hoy y falla si se agrega un import de Flask en un `domain` de prueba.
- [x] Alias `@/` en `tsconfig.json`, `vite.config.ts` y `vitest.config.ts`. Comprobación: `npm run build`.
- [x] `frontend/src/fronteras.test.ts`. Comprobación: pasa hoy y falla con un import interno nuevo entre features.
- [x] `pytest`, `npm test` y `npm run build` en verde; commit en Windows; tareas de la fase 0 marcadas en el plan.
