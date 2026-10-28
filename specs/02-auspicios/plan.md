# Fase 2 · Plan

## Capas

| Capa | Archivo | Qué tiene |
| --- | --- | --- |
| domain | `patrocinador.py` | `Patrocinador`: nombre, logo, imagen promocional, id y fechas |
| application | `casos_de_uso.py` | `listar`, `obtener`, `crear`, `actualizar`, `eliminar` y el error `NoSeGuardo` |
| infrastructure | `repositorio.py` | `RepositorioPatrocinadores`: `listar`, `obtener`, `agregar`, `guardar`, `eliminar`; convierte la fila del modelo en la entidad |
| http | `rutas.py`, `esquemas.py` | blueprint `patrocinadores` y `PatrocinadorSchema` (movido tal cual) |

## Piezas que reciben los casos de uso

- `repositorio`: el de arriba.
- `almacen`: cualquier objeto con `subir_archivo(stream, nombre, carpeta, mime)` y `borrar_archivo(url)`. En producción es el módulo `app.shared.infrastructure.almacenamiento`; en las pruebas, un falso que anota las llamadas.
- `unidad`: `confirmar()` y `revertir()`. En producción, `UnidadDeTrabajo` de `shared/infrastructure`.
- El blueprint arma las piezas en cada petición (`_piezas()`): sin inyección de dependencias ni fábricas.

## Reparto de lo que hoy hace la ruta

- `http` valida el formulario (422 `VALIDATION_ERROR`, "Datos inválidos"), exige el logo al crear (422 `MISSING_FILE`) y valida el archivo por sus bytes (400 `INVALID_FILE`), en el mismo orden que hoy.
- `application` sube y borra logos, guarda y confirma. Si la base rechaza el cambio revierte, borra el logo recién subido al crear y lanza `NoSeGuardo`, que `http` responde con el 500 `DB_ERROR` y el mensaje de cada ruta.
- `NoEncontrado("Patrocinador no encontrado.")` sale como 404 por el manejador de `shared/http`; en `PUT` se busca antes de validar el formulario, como hoy.
- El orden con Storage queda igual: al actualizar se sube el logo nuevo, se borra el viejo y después se confirma; al eliminar se confirma y después se borra el logo.

## Retiro de lo viejo

- `app/__init__.py` registra el blueprint del módulo.
- Se borran `app/routes/patrocinador_bp.py` y `app/schemas/patrocinador_schema.py`. Si la carpeta de Windows no deja borrar, quedan como reexportaciones de una línea hasta que se puedan borrar.
- `ORM_EN_RUTAS` baja a 50.

## Recalibrar

- Se mide lo que costó el piloto (archivos, líneas y casos de contrato) y se reestiman las fases 3 a 8 en proporción a su código actual.
- Resultado: el piloto movió 95 líneas de código viejo (sin docstrings) a 167 líneas en cuatro capas, más 77 de pruebas y 2 casos de contrato nuevos. Regla: 1,5 h fijas por módulo (especificación, documentación, verificación y despliegue) más 1,5 h por cada 100 líneas viejas, ±15 %.

| Fase | Líneas viejas | Antes | Ahora |
| --- | --- | --- | --- |
| 3 · competencia | 730 | 10–14 h | 11–14 h |
| 4 · torneos | 297 | 5–7 h | 5–7 h |
| 5 · plantel | 881 | 8–10 h | 12–17 h |
| 6 · inscripciones | 751 | 8–10 h | 11–15 h |
| 7 · estadísticas | 375 | 8–10 h | 6–8 h |
| 8 · identidad y cierre | 110 + el cierre | 4–6 h | 4–6 h |

- Las líneas de `torneo_bp` que sirven posiciones, fase final, recorrido, grupos y formatos cuentan para competencia, y la de líderes para estadísticas. El frontend (fases 9 y 10) no se recalibra con este piloto. Total: de 80–111 h a 86–121 h.
