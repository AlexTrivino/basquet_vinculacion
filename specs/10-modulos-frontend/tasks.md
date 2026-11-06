# Fase 10 · Tareas

Cada módulo es un commit. Comprobación de cada uno: `npm test` (con la prueba de fronteras), `npm run build` sin código de más en el chunk inicial y la prueba de humo igual a la del build de `6294037`.

- [x] `specs/10-modulos-frontend`: spec, plan y tareas.
- [x] auth, y `"sideEffects": ["*.css"]` en `package.json`: sin eso, lo que un `index.ts` reexporta para otros módulos termina en el chunk inicial cuando `app` importa sus `rutas` (medido: react-router y `AuthContext` salían a dos chunks precargados, y con auspicios el carrusel y su API entraban al `index`). En `src` solo `main.tsx` (la entrada) y `index.css` tienen efectos al importarse; `axios.config.ts` configura su propia instancia, que siempre se usa.
- [x] auspicios.
- [ ] sanciones.
- [ ] partidos, con `getPartidosByTorneo`, `postEstadisticasBulk` y `clavesPartidos`.
- [ ] torneos, con `clavesTorneos` y `CalendarioTorneo`.
- [ ] inscripciones, con sus llamadas fuera de `equipos.api.ts`.
- [ ] equipos.
- [ ] jugadores.
- [ ] visor.
- [ ] flyers.
- [ ] estadísticas, con `LideresEstadisticos` y el panel del admin.
- [ ] portada, con el Footer y Contacto.
- [ ] Cierre: carpetas viejas borradas, fronteras estrictas sin trinquete (comprobación: falla con un import interno, con un ciclo y con un archivo suelto), `.agents/AGENTS.md`, README, `DESIGN.md` y `Docs/04_estructura_carpetas.md`.
- [ ] Entrega en Windows y fase 10 marcada en el plan.
