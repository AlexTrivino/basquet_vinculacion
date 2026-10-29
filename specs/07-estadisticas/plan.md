# Fase 7 · Plan

## Capas

| Capa | Archivo | Qué tiene |
| --- | --- | --- |
| domain | `estadisticas.py` | `JUGADOS`, `CON_PUNTOS`, `CARGABLES` y `RUBROS`; `PartidoParaCarga`, `LineaDePlanilla` y `Planilla`; `valoracion`, `orden_de_figura`, `etiqueta_categoria`, `lideres`, `validar_carga` y `validar_jugadores_propios` |
| application | `estadisticas.py` | la portada, el tablero, la actividad reciente, los líderes, los flyers, la planilla y la carga |
| infrastructure | `repositorio.py` | `RepositorioEstadisticas`: las consultas de las rutas y los servicios de hoy; la carga borra las líneas de los jugadores que vienen, las inserta en una sola sentencia, agrega las sanciones y marca al equipo como procesado |
| http | `estadisticas.py`, `lideres.py`, `reportes.py`, `planilla_pdf.py` y `esquemas.py` | los tres blueprints, el PDF de la planilla y el esquema de la carga, movido tal cual |

## Piezas que reciben los casos de uso

- `repositorio`: `RepositorioEstadisticas`.
- `unidad`: `UnidadDeTrabajo`, en la carga.
- Quien carga llega como `rol`, que `http` saca del token, y la carga recibe la fecha de hoy para las sanciones.

## Reparto de lo que hoy hace cada ruta

- El orden de los errores no cambia. `http` valida el JSON y el esquema antes de llamar a la carga, como hoy.
- Los errores salen con el código de siempre: `SinPermiso` 403 (cargarle números a un jugador que no está en la plantilla del equipo) y `ReglaDeNegocio` 422 (todo lo demás de la carga). `http` traduce lo demás: en los flyers, una fecha que no es fecha o un torneo que no existe son 400, y en la planilla, un partido que no existe o que no terminó es 422. Los líderes de un torneo que no existe o no está vigente son 404.
- La carga es una sola transacción: si la base rechaza una línea (un jugador repetido), el error es el 500 de siempre y no se confirma nada.
- `planilla_pdf.py` arma el PDF con la `Planilla` que devuelve el caso de uso: mismos estilos, tablas y textos que `reportes_service`.
- Los líderes leen la fila del torneo con el modelo compartido y le preguntan a `torneos.application` si está `vigente`.

## Retiro de lo viejo

- `app/__init__.py` registra los blueprints del módulo.
- Se borran `app/routes/{stats_bp,reportes_bp,lideres_bp}.py`, `app/services/{stats_service,lideres_service,flyers_service,reportes_service}.py` y `app/schemas/stats_schema.py`, y con ellos los paquetes `app/services` y `app/schemas`, que quedan vacíos.
- `ORM_EN_RUTAS` baja de 11 a 4 con lo que se fue de `stats_bp` (la portada, el tablero y la actividad reciente).
- No pasan al módulo tres piezas de código muerto: dos esquemas que nadie usaba (`EstadisticaPublicSchema` y `BoxScoreItemSchema`), la rama que volvía a rechazar al delegado y la traducción de un rechazo de la base al confirmar, que no podía ocurrir porque las sentencias ya fallan antes.

## Resultado

- Las 378 líneas viejas (sin docstrings) pasaron a 373 en las cuatro capas, más 98 de pruebas y 9 casos de contrato. Son 3 más que las 375 de la recalibración de la fase 2: la estimación de la fase 8 no cambia.
