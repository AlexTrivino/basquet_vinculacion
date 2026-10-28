# Fase 3 · Backend: competencia

## Problema

Partidos, sanciones, tabla de posiciones y fase final viven en tres blueprints (`partido_bp`, `sancion_bp` y seis rutas de `torneo_bp`), cuatro servicios (`partido_service`, `sancion_service`, `standings` y `llaves_service`) y dos esquemas. Las reglas del torneo están mezcladas con las consultas, así que solo se pueden probar con una base de datos: no hay empates, en la fase de grupos solo se cruzan equipos del mismo grupo, el desempate FIBA, el cuadro de llaves y el recorrido de cada grupo.

## Qué entrega

- `app/modules/competencia/` con sus cuatro capas:
  - `domain/`: `posiciones.py` (tabla y desempate FIBA), `llaves.py` (formatos, cuadro de llaves, grupos y recorrido), `partido.py` (la entidad, las reglas para programar, editar y finalizar un partido, y el box score) y `sancion.py` (la entidad).
  - `application/`: `partidos.py`, `sanciones.py` y `fase_final.py`, una función por caso de uso.
  - `infrastructure/repositorio.py`: `RepositorioPartidos` y `RepositorioSanciones` sobre los modelos compartidos.
  - `http/`: los blueprints `partidos` y `sancion_bp` (mismo prefijo, rutas y nombres de vista), el blueprint `competencia` con las seis rutas de posiciones, fase final, recorrido, grupos y formato que hoy están en `torneo_bp`, y los esquemas marshmallow.
- `shared`: la paginación se separa en `pagina_pedida` (lee `page` y `per_page`, en `http`) y `paginar` (pagina la consulta, en `infrastructure`). `paginate_query` sigue igual para el código viejo.
- Pruebas de las reglas y de los casos de uso con piezas falsas, sin base de datos.
- Se retiran `partido_bp`, `sancion_bp`, los cuatro servicios y los dos esquemas, y las seis rutas salen de `torneo_bp`.

## Fuera de alcance

- Cambiar comportamiento. Se conservan, y quedan anotadas para otra especificación, estas rarezas de hoy:
  - Subir un acta borra la anterior antes de validar la nueva: si la nueva no sirve, el partido queda apuntando a un acta borrada.
  - El box score lista la plantilla del equipo en todas las categorías del torneo, no solo en la del partido.
  - `POST /api/sanciones/` no valida la entrada y en SQLite responde 500 (pasa la fecha como texto). Las respuestas de `/api/sanciones` no llevan `success`.
- Lo único que se quita no cambia ninguna respuesta: el cálculo de la tabla que se hacía después de finalizar o anular un partido y se descartaba, y `eliminar_partido`, que ninguna ruta usa.
- Torneos: el módulo busca el torneo con `torneo_service` hasta la fase 4. Los líderes (`/api/torneos/<id>/lideres`) siguen en `torneo_bp` hasta la fase 7.

## Criterios de aceptación

- [x] Las pruebas de contrato de partidos, sanciones, posiciones y fase final pasan sin regrabar `referencias.json`. Antes de mover nada se agregan seis casos que faltaban y se graban con el código de `da86491`: quedan 91.
- [x] `test_capas.py` pasa con el módulo: `domain` y `application` sin Flask, SQLAlchemy ni marshmallow.
- [x] Las reglas tienen pruebas sin base (el cruce, el cambio de equipos, el empate, el box score, los grupos, el cuadro de llaves y el recorrido), y los casos de uso, con piezas falsas.
- [x] Nada importa las rutas, servicios ni esquemas retirados, y el trinquete de ORM en `app/routes` baja de 50 a 41.
- [x] README y `.agents/AGENTS.md` describen el módulo.
- [x] `pytest`, `npm test` y `npm run build` en verde.
