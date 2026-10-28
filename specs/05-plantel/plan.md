# Fase 5 · Plan

## Capas

| Capa | Archivo | Qué tiene |
| --- | --- | --- |
| domain | `equipo.py` | `Equipo` (con su delegado y sus inscripciones para la vista de administración), `puede_gestionar(equipo, id_usuario, rol)` y `validar_cupo_de_equipos(activos)` |
| domain | `jugador.py` | `Jugador` con sus plantillas, `CAMPOS_PRIVADOS`, `puede_ver_privados`, `delegado_puede_gestionar`, `sin_privados`, `edad`, `hace_anios` y `CedulaRepetida` |
| application | `equipos.py` | listar, listar para administración, obtener, `para_gestionar`, crear, actualizar, dar de baja, reactivar, y reemplazar o quitar el logo y el banner |
| application | `jugadores.py` | listar, ficha, buscar por cédula, `para_gestionar`, crear, actualizar, dar de baja, reemplazar la foto, la cédula o el acta, perfil y las dos consultas del visor |
| infrastructure | `repositorio.py` | `RepositorioEquipos` y `RepositorioJugadores`: las consultas de los servicios de hoy; el perfil y el visor devuelven los mismos diccionarios que hoy |
| http | `equipos.py`, `jugadores.py`, `visor.py` y `esquemas.py` | los tres blueprints y los esquemas de equipo y jugador movidos tal cual (el de administración del jugador lee las plantillas de la entidad) |

## Piezas que reciben los casos de uso

- `repositorio`: uno de los dos de arriba. Al agregar o actualizar, si la base rechaza el cambio lanza `Conflicto`.
- `almacen`: `subir_archivo`, `borrar_archivo` y `borrar_en_segundo_plano`. Logo y banner reciben además `validar(stream) -> mime`, porque hoy la imagen vieja se borra antes de validar la nueva.
- `unidad`: `UnidadDeTrabajo`.
- Quien pide: `(id_usuario, rol)`, que `http` saca del token (`g` o `identidad_opcional`).

## Reparto de lo que hoy hace cada ruta

- El orden de los errores no cambia. Donde hoy se busca y se autoriza antes de leer el cuerpo o el archivo (editar o borrar un jugador, subir sus documentos, subir o quitar imágenes de un equipo), `http` llama primero a `para_gestionar`; donde la autorización va después de validar (editar o dar de baja un equipo), la hace el caso de uso.
- `SinPermiso` (403) lleva los mensajes de hoy, uno por acción. `NoEncontrado`: 'Equipo no encontrado.', 'Equipo no encontrado o ya activo.' al reactivar y 'Jugador no encontrado.'.
- `http` traduce lo que hoy no sale con el código de siempre: la cédula repetida al crear lleva en `data` al jugador que ya la tiene; en las imágenes de un equipo, un archivo que no sirve es 422, una falla de Storage 500 con su mensaje y lo inesperado 500 con el mensaje de cada ruta; en los documentos del jugador, un archivo que no sirve es 415 y una falla de Storage 502; un equipo sin logo o sin banner es 400.
- La privacidad queda en el dominio: el listado completo es solo del super_admin; la ficha y el perfil muestran los datos personales al super_admin y al delegado de un equipo del jugador.

## Retiro de lo viejo

- `app/__init__.py` registra los blueprints del módulo.
- Se borran `app/routes/{equipo_bp,jugador_bp,visor_bp}.py`, `app/services/{equipo_service,jugador_service,jugador_profile_service,visor_service}.py` y `app/schemas/{equipo_schema,jugador_schema}.py`.
- `app/utils/business_rules.py` y `app/utils/text_utils.py` pasan a `app/shared/domain/` y quedan como reexportaciones; `inscripcion_bp`, `plantilla_service` y `config_bp` importan de `shared`.
- `tests/test_jugador_admin_filters.py` y `tests/test_fase1_jugador.py` importan del módulo.
- `ORM_EN_RUTAS` baja de 39 a 29 con lo que se fue de `equipo_bp` y `jugador_bp`.

## Resultado

- Las 881 líneas viejas (sin docstrings) pasaron a 846 en las cuatro capas, más 162 de pruebas y 31 casos de contrato. Son las mismas 881 de la recalibración de la fase 2: la estimación de las fases que siguen no cambia.
