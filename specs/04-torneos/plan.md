# Fase 4 · Plan

## Capas

| Capa | Archivo | Qué tiene |
| --- | --- | --- |
| domain | `torneo.py` | `Torneo` con sus `Categoria`; `OCULTOS` (inactivo y anulado), `vigente(estado)`, `validar_fechas(inicio, fin)` y `GENEROS` |
| application | `casos_de_uso.py` | `listar`, `listar_todos`, `abiertos_a_inscripcion`, `obtener`, `crear`, `actualizar`, `dar_de_baja`, `anular` y `subir_calendario`; `listar_categorias`, `obtener_categoria`, `agregar_categoria` y `eliminar_categoria` |
| infrastructure | `repositorio.py` | `RepositorioTorneos`: las consultas de hoy de torneos y categorías; convierte las filas en entidades |
| http | `torneos.py`, `categorias.py` y `esquemas.py` | los blueprints `torneos` y `categorias`, y los esquemas de torneo y categoría movidos tal cual |

## Piezas que reciben los casos de uso

- `repositorio`: `RepositorioTorneos`. `obtener(id)` devuelve el torneo en cualquier estado; el caso de uso `obtener` es el que exige que esté vigente.
- `almacen`: el de siempre (`subir_archivo`), para el calendario.
- `unidad`: `UnidadDeTrabajo`.

## Otros módulos

- Competencia ya no usa `torneo_service`: su repositorio lee la fila del torneo con el modelo compartido y llama a `vigente` de la application de torneos. La regla queda en un solo lugar y competencia entra a torneos solo por su application.
- `lideres_bp.py` (código viejo hasta la fase 7) busca el torneo con `obtener` del módulo.

## Reparto de lo que hoy hace cada ruta

- `http` lee los parámetros, valida el JSON con los esquemas y deja los errores en el orden de hoy: el torneo se busca antes de leer el cuerpo al editarlo o agregarle una categoría, y antes de validar el archivo del calendario, que se revisa después de comprobar que llegó y tiene nombre.
- `NoEncontrado` lleva los mensajes de hoy: 'Torneo no encontrado.', 'Torneo no encontrado o ya inactivo/anulado.' al anular y 'Categoría no encontrada.'. La fecha de fin antes del inicio es `ReglaDeNegocio` (422) y una categoría con equipos inscritos, `Conflicto` (409).
- Lo que hoy no sale con el código de siempre lo traduce `http`: en el calendario, un archivo que no sirve o una fecha incoherente responden 400 `BAD_REQUEST`, y lo inesperado, 500 `SERVER_ERROR`.

## Retiro de lo viejo

- `app/__init__.py` registra los blueprints `torneos` y `categorias` del módulo y `lideres_bp`.
- Se borran `app/routes/categoria_bp.py`, `app/services/{torneo_service,categoria_service}.py` y `app/schemas/{torneo_schema,categoria_schema}.py`. `app/routes/torneo_bp.py` pasa a `app/routes/lideres_bp.py` con la ruta de líderes sola.
- `tests/test_fase4_torneos.py` usa los casos de uso del módulo en vez de los servicios.
- `ORM_EN_RUTAS` baja de 41 a 39.

## Resultado

- Las 297 líneas viejas (sin docstrings) pasaron a 343 en las cuatro capas, más 101 de pruebas y 15 casos de contrato. Son las mismas 297 de la recalibración de la fase 2: la estimación de las fases que siguen no cambia.
