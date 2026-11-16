# Fase 13 · Plan

## Backend (módulo competencia)

- `domain/podio.py`: `podio(estado, partidos, tabla)`, en Python puro. Lee las llaves jugadas del estado de la fase final (`llaves.estado_fase_final`), arma los puestos y les suma los totales de `calcular_tabla` sobre todos los partidos finalizados de la categoría y los sellos.
- `application/fase_final.py`: `podios_de_portada(repositorio)` recorre los torneos del que termina último al primero y devuelve el primero con algún podio. Reusa `estado` y `tabla_de_posiciones`. Anotado con `ponytail:`: si muchos torneos seguidos no tienen finales, una consulta propia.
- `infrastructure/repositorio.py`: `torneos_recientes()` (los vigentes según `torneos.application`), `categorias_del_torneo()` y `partidos_finalizados()` (fase de grupos y llaves).
- `http/fase_final.py`: `GET /api/torneos/podios`, sin token. El caso de uso ya arma solo campos públicos: no hace falta esquema.
- Pruebas: `tests/test_podio.py` (la ruta sobre SQLite y el dominio puro para el repechaje) y el caso de contrato `GET /api/torneos/podios · anónimo`.

## Frontend

- `modules/partidos`: `getPodios` y sus tipos, por su `index.ts` (la portada ya depende de partidos).
- `modules/portada/components/SeccionPodio.tsx`: la sección, el podio (`Escalon`) y la franja (`Ficha`). El cono es un tercio del ancho que se corre con `transform`; la entrada usa `data-podio` y dos animaciones nuevas en `index.css`, apagadas con movimiento reducido.
- `Home.tsx`: la sección entre Partidos y Figuras. `Home.test.tsx` simula la API nueva y espera la sección en su lugar.
- `SeccionPodio.test.tsx`, `DESIGN.md` (sección y metales del podio) y `.agents/AGENTS.md`.

## Comprobación

- `pytest` en Python 3.12 y 3.13 (contrato con un caso más), `npm test`, build y prueba de humo (42 rutas, igual a la base).
- Tamaños contra `abcc708`: el chunk inicial no cambia; `Home` crece 9,7 KB, el CSS 4,2 KB y `partidos.api` 70 bytes.
- Capturas en 1440 px (con y sin el cursor encima) y en el iPhone 13, con la API simulada con los datos reales del torneo 5.
