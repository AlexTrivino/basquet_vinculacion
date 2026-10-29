# Fase 7 · Backend: estadísticas

## Problema

Las estadísticas viven en tres blueprints (`stats_bp`, `reportes_bp` y `lideres_bp`, 7 rutas), cuatro servicios (`stats_service`, `lideres_service`, `flyers_service` y `reportes_service`) y un esquema. Qué partidos cuentan se decide en cada consulta, con un criterio distinto según la vista. La carga de un equipo por partido mezcla las validaciones con el SQL, y la ruta decide si el error es 403 buscando texto en el mensaje. `stats_bp` arma la portada, el tablero y la actividad reciente con consultas al ORM dentro de la ruta.

## Qué entrega

- `app/modules/estadisticas/` con sus cuatro capas:
  - `domain/estadisticas.py`: qué partidos cuentan en cada vista (`JUGADOS`, `CON_PUNTOS` y `CARGABLES`, con nombre), la valoración y el orden de la figura, la etiqueta de la categoría, los líderes de cada rubro, las validaciones de la carga y lo que lleva la planilla oficial (`Planilla`).
  - `application/estadisticas.py`: la portada, el tablero, la actividad reciente, los líderes, los flyers, la planilla y la carga de un equipo en un partido.
  - `infrastructure/repositorio.py`: `RepositorioEstadisticas`, con las consultas de hoy; los flyers, el tablero y la actividad reciente devuelven los mismos diccionarios.
  - `http/`: los blueprints `estadisticas`, `lideres` y `reportes` (mismos prefijos, rutas y nombres de vista), el esquema de la carga y el PDF de la planilla (`planilla_pdf.py`, con ReportLab).
- Los líderes preguntan a `torneos.application` si el torneo está vigente, como competencia.
- Pruebas de las reglas y de los casos de uso con piezas falsas.
- Se retiran los tres blueprints, los cuatro servicios y el esquema. `app/services` y `app/schemas` quedan vacíos y se borran.

## Fuera de alcance

- Cambiar comportamiento. Se conservan, y quedan anotadas para otra especificación, estas rarezas de hoy:
  - Qué partidos cuentan depende de la vista. Los líderes, la planilla y los resultados de los flyers cuentan los finalizados y los ganados por W.O.; la portada y las figuras de los flyers, solo los finalizados; el perfil del jugador y el buscador del visor (en plantel) suman todos. Unificarlo es una decisión abierta del plan.
  - El token deja cargar al delegado, pero la carga le responde 422, no 403. Un partido que no existe es 422 en la carga y en la planilla, y un torneo que no existe es 400 en los flyers.
  - Volver a cargar un equipo reemplaza solo las líneas de los jugadores que vienen. El que no viene conserva la suya, las sanciones se suman otra vez y su fecha es la del día de la carga, no la del partido.
  - La carga acepta `robos` y no los guarda, y la columna `valoracion` queda en 0: la valoración se calcula al leer. Un jugador repetido en la carga es 500 `DATABASE_ERROR`.
  - En los líderes, una categoría que no es número se ignora y salen todas.
  - En el tablero, `partidos_hoy` cuenta todos los programados, no los de hoy; `partidos_sin_estadisticas` solo mira los finalizados, y `equipos_totales` cuenta también los inactivos. La actividad reciente muestra los ids del equipo y del torneo, no sus nombres.
- `seed_database.py`, `seeders/` y los scripts siguen usando los modelos compartidos.

## Criterios de aceptación

- [x] Las pruebas de contrato de estadísticas, líderes y la planilla pasan sin regrabar `referencias.json`. Antes de mover nada se agregan 9 casos que faltaban y se graban con el código de `2590630`: quedan 40.
- [x] `test_capas.py` pasa con el módulo y nada importa las rutas, servicios ni esquemas retirados.
- [x] Las reglas tienen pruebas sin base (qué partidos cuentan, la valoración, la figura, la etiqueta de la categoría, los líderes y las validaciones de la carga), y los casos de uso, con piezas falsas.
- [x] El trinquete de ORM en `app/routes` baja.
- [x] El PDF de la planilla dice lo mismo que antes (texto comparado con `pdftotext`).
- [x] README y `.agents/AGENTS.md` describen el módulo.
- [x] `pytest`, `npm test` y `npm run build` en verde.
