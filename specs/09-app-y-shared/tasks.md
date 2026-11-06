# Fase 9 · Tareas

- [x] `specs/09-app-y-shared`: spec, plan y tareas.
- [x] `Escudo`, `Esquinas`, `withSuspense` y el catálogo en sus archivos de `shared`. Comprobación: `tsc` sin errores.
- [x] `app/`, `shared/ui`, `shared/api` y `shared/lib` con `git mv` y los imports reescritos; `index.html` carga `app/main.tsx`. Comprobación: `npm test`, y ningún import en `shared/` hacia el código viejo.
- [x] Trinquete de la prueba de fronteras en lo que quede. Comprobación: la prueba pasa con el número nuevo y falla con el viejo.
- [x] `npm run build` sin código de más en el chunk inicial (solo crece el mapa de precarga, 97 bytes). Comprobación: bytes del `index` y de lo que precarga, antes y después.
- [x] Prueba de humo con Playwright sobre el build de antes y el de después. Comprobación: mismo texto y ningún error en las 42 rutas de las cuatro sesiones.
- [x] README, `.agents/AGENTS.md`, la skill de frontend y `specs/README.md`.
- [x] Commit, entrega en Windows y fase 9 marcada en el plan.
