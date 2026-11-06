# Fase 10 · Tareas

Cada módulo es un commit. Comprobación de cada uno: `npm test` (con la prueba de fronteras), `npm run build` sin código de más en el chunk inicial y la prueba de humo igual a la del build de `6294037`.

- [x] `specs/10-modulos-frontend`: spec, plan y tareas.
- [x] auth, y `"sideEffects": ["*.css"]` en `package.json`: sin eso, lo que un `index.ts` reexporta para otros módulos termina en el chunk inicial cuando `app` importa sus `rutas` (medido: react-router y `AuthContext` salían a dos chunks precargados, y con auspicios el carrusel y su API entraban al `index`). En `src` solo `main.tsx` (la entrada) y `index.css` tienen efectos al importarse; `axios.config.ts` configura su propia instancia, que siempre se usa.
- [x] auspicios.
- [x] sanciones, con `Sancion` en su `types.ts`. Trinquete 19 → 18.
- [x] partidos, con `getPartidosByTorneo`, `postEstadisticasBulk` y `clavesPartidos` (18 claves escritas a mano en 11 archivos pasan a la fábrica). Trinquete 18 → 11.
- [x] torneos, con `clavesTorneos` (9 claves en 6 archivos), `CalendarioTorneo` y `types.ts` (posiciones, llaves y recorrido); `LideresEstadisticos` y `getLideresEstadisticos` esperan en `features/estadisticas`. Trinquete 11 → 10.
- [x] inscripciones, con sus doce llamadas fuera de `equipos.api.ts` (`inscripciones.api.ts`). El chunk inicial baja 938 bytes: el Navbar ya no arrastra las llamadas de equipos. Trinquete 10 → 3.
- [x] equipos, con el panel del delegado y `BannerNuevosTorneos`. Trinquete 3 → 2.
- [ ] jugadores.
- [ ] visor.
- [ ] flyers.
- [ ] estadísticas, con `LideresEstadisticos` y el panel del admin.
- [ ] portada, con el Footer y Contacto.
- [ ] Cierre: carpetas viejas borradas, fronteras estrictas sin trinquete (comprobación: falla con un import interno, con un ciclo y con un archivo suelto), `.agents/AGENTS.md`, README, `DESIGN.md` y `Docs/04_estructura_carpetas.md`.
- [ ] Entrega en Windows y fase 10 marcada en el plan.
