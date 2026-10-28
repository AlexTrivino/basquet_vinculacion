# Fase 6 · Plan

## Capas

| Capa | Archivo | Qué tiene |
| --- | --- | --- |
| domain | `inscripcion.py` | `Inscripcion` con el resumen de su torneo, equipo y categoría; `validar_torneo_para_inscribir`, `validar_equipo_para_inscribir`, `validar_un_borrador`, `validar_club_nuevo` (con `SinCupoParaClubNuevo`), `validar_envio` y `validar_retiro` |
| domain | `plantilla.py` | `Plantilla` con su jugador, `edad_deportiva`, `validar_edad`, `validar_cupo_de_plantilla` y `ve_datos_personales` |
| application | `inscripciones.py` | listar (públicas y por rol), crear, reinscribir, `para_gestionar`, cambiar estado, editar, eliminar el borrador, retirar, subir el comprobante, el alta completa de un club, enviar a revisión y purgar |
| application | `plantillas.py` | listar, obtener, `para_gestionar`, agregar un jugador, cambiar el dorsal y remover |
| infrastructure | `repositorio.py` | `RepositorioInscripciones` y `RepositorioPlantillas`: las consultas de los servicios y de las rutas de hoy; `borrar` hace la cascada y devuelve los archivos de Storage que quedaron sin dueño |
| http | `inscripciones.py`, `plantillas.py` y `esquemas.py` | los dos blueprints y los esquemas de inscripción y plantilla movidos tal cual |

## Piezas que reciben los casos de uso

- `repositorio`: uno de los dos de arriba. Al agregar, si la base rechaza el cambio lanza `Conflicto`.
- `almacen`: `subir_archivo` y `borrar_archivo`.
- `unidad`: `UnidadDeTrabajo`.
- Quien pide: `(id_usuario, rol)`, que `http` saca del token. La purga recibe la hora de ahora y la plantilla, la fecha de hoy.

## Reparto de lo que hoy hace cada ruta

- El orden de los errores no cambia. Donde hoy se busca y se autoriza antes de leer el cuerpo o el archivo (subir el comprobante, cambiar el dorsal o remover a un jugador), `http` llama primero a `para_gestionar`.
- Los errores salen con el código de siempre: `NoEncontrado` 404, `SinPermiso` 403, `Conflicto` 409 y `ReglaDeNegocio` 422, como hoy en el alta, la reinscripción y la plantilla. `http` traduce lo demás: el cupo y el borrador de `/completa` son 409 (`SinCupoParaClubNuevo`) y cualquier otra falla ahí, 500; todo error de editar o de eliminar el borrador es 400, y lo inesperado, 500 con el mensaje de cada ruta; el retiro de una inscripción que no está aprobada es 400; los errores del envío a revisión salen como `UNPROCESSABLE_ENTITY`; en el comprobante, un archivo que no sirve es 415 y una falla de Storage 502.
- `/completa` es todo o nada: si algo falla después del cupo, el caso de uso revierte y borra de Storage lo que ya subió.
- Rechazar, eliminar el borrador y purgar usan la misma cascada: plantillas del equipo en ese torneo, jugadores que solo estaban ahí con sus documentos, el comprobante y el equipo si se queda sin inscripciones.
- `/api/jugadores/buscar` pregunta a la application de plantel (`en_torneo`), que lee la plantilla con el modelo compartido, como hace competencia con el torneo.

## Retiro de lo viejo

- `app/__init__.py` registra los blueprints del módulo.
- Se borran `app/routes/{inscripcion_bp,plantilla_bp}.py`, `app/services/{inscripcion_service,plantilla_service}.py` y `app/schemas/{inscripcion_schema,plantilla_schema}.py`.
- `tests/test_inscripcion_rechazo_purga.py`, `tests/test_inscripcion_draft_roster.py`, `tests/test_plantilla_patch.py`, `tests/test_fase4_torneos.py`, `tests/test_schemas_rigor.py` y `tests/test_fase1_jugador.py` usan el módulo.
- `ORM_EN_RUTAS` baja de 29 a 11 con lo que se fue de `inscripcion_bp` y `plantilla_bp`.
- `backend/test_error.py`, un script de depuración que pytest recoge por su nombre, llama al caso de uso del módulo.
- `enviar_cambios` (mandar la sesión a la base y traducir un rechazo a `Conflicto`) pasa de plantel a `shared/infrastructure/db.py`, porque ahora lo usan dos módulos.

## Resultado

- Las 748 líneas viejas (sin docstrings) pasaron a 839 en las cuatro capas, más 267 de pruebas y 27 casos de contrato. Son 3 menos que las 751 de la recalibración de la fase 2 (la fase 5 cambió unos imports): la estimación de las fases que siguen no cambia.
