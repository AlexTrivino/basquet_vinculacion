# Fase 3 · Plan

## Capas

| Capa | Archivo | Qué tiene |
| --- | --- | --- |
| domain | `posiciones.py` | `calcular_tabla`, `desempatar`, `tablas_por_grupo` y `marcador_efectivo`, tal cual estaban en `standings`, y las filas de la respuesta con el nombre y el logo de cada equipo |
| domain | `llaves.py` | `FORMATOS`, la `Categoria` que usa la fase final, `estado_fase_final`, `recorrido` y `asignar_grupos`: lo de `llaves_service` sin las consultas |
| domain | `partido.py` | `Partido` con sus resúmenes de torneo, categoría y equipos; `validar_cruce`, `validar_cambio_de_equipos`, `validar_sin_empate` y `box_score` |
| domain | `sancion.py` | `Sancion` con su jugador y su partido |
| application | `partidos.py` | `listar`, `obtener`, `crear`, `actualizar`, `anular`, `restaurar`, `box_score`, `subir_acta` y `eliminar_acta` |
| application | `sanciones.py` | `listar`, `crear` y `actualizar` |
| application | `fase_final.py` | `nombre_del_torneo`, `categoria_del_torneo`, `posiciones`, `estado`, `recorrido`, `asignar_grupos`, `generar_llaves` y `guardar_formato` |
| infrastructure | `repositorio.py` | `RepositorioPartidos` (partidos, inscripciones, equipos, plantilla, estadísticas y categorías) y `RepositorioSanciones`, con las consultas de hoy |
| http | `partidos.py`, `sanciones.py`, `fase_final.py` y `esquemas.py` | los tres blueprints y los esquemas de partido (movidos tal cual) y de sanción |

## Piezas que reciben los casos de uso

- `repositorio`: uno de los dos de arriba. Si la base rechaza un partido nuevo (`IntegrityError`), lanza `Conflicto`.
- `almacen`: el de auspicios (`subir_archivo`, `borrar_archivo`). `subir_acta` recibe además `validar(stream) -> mime`, porque hoy el acta vieja se borra antes de validar la nueva.
- `unidad`: `UnidadDeTrabajo`.

## Reparto de lo que hoy hace cada ruta

- `http` lee los parámetros, valida el JSON con los esquemas y traduce lo que hoy no sale con el código de siempre:
  - `DELETE /api/partidos/<id>/acta` sin acta: `ReglaDeNegocio` → 400 `BAD_REQUEST`.
  - `POST /api/torneos/<id>/fase-final/partidos`: cualquier error de una llave → 409 `CONFLICT`.
  - `PUT /api/torneos/categorias/<id>/formato` con un formato desconocido: 422 con la lista de formatos en `data`.
  - Las cuatro rutas que hoy capturan todo (anular, restaurar, subir y eliminar acta) siguen respondiendo 500 `SERVER_ERROR` ante un error que no es de dominio.
- El orden de los errores no cambia: lo que hoy se busca antes de validar se busca primero en `http` con `obtener`, `nombre_del_torneo` o `categoria_del_torneo` (el partido al editarlo o subir su acta, el torneo antes de leer la categoría de la tabla, el torneo y la categoría antes de validar grupos y llaves).
- Los mensajes de `NoEncontrado` son los de hoy: 'Partido no encontrado.', 'El partido no existe.' al anular o restaurar, 'Torneo no encontrado.', 'Categoría no encontrada en este torneo.', 'Categoría no encontrada.' y, en sanciones, el 404 genérico 'El recurso solicitado no fue encontrado.'.
- La fase final se calcula en el dominio con lo que le pasa el caso de uso; el repositorio solo hace las mismas consultas de hoy.

## Retiro de lo viejo

- `app/__init__.py` registra los tres blueprints del módulo.
- Se borran `app/routes/partido_bp.py`, `app/routes/sancion_bp.py`, `app/services/{partido_service,sancion_service,standings,llaves_service}.py` y `app/schemas/{partido_schema,sancion_schema}.py`. Las seis rutas salen de `torneo_bp`.
- `tests/test_desempate.py`, `tests/test_fase_final.py` y `tests/test_schemas_rigor.py` importan del módulo.
- `ORM_EN_RUTAS` baja de 50 a 41 con lo que se fue de `partido_bp` y `torneo_bp`.

## Resultado

- Las 730 líneas viejas (sin docstrings) pasaron a 850 en las cuatro capas, más 131 de pruebas y 6 casos de contrato. Son las mismas 730 que usó la recalibración de la fase 2, así que la estimación de las fases que siguen no cambia.
