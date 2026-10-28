# Fase 1 · Plan

## Movimientos

| Hoy | Pasa a |
| --- | --- |
| `SafeSQLAlchemy`, `db` y `migrate` de `app/__init__.py` | `app/shared/infrastructure/db.py` |
| `app/models/*.py` (14 modelos y el `__init__`) | `app/shared/infrastructure/modelos/` |
| `app/utils/storage.py` | `app/shared/infrastructure/almacenamiento.py` |
| `app/utils/response.py` | `app/shared/http/respuestas.py` |
| `app/utils/pagination.py` | `app/shared/http/paginacion.py` |
| `app/utils/auth_middleware.py` | `app/shared/http/autenticacion.py` |
| `app/utils/error_handlers.py` | `app/shared/http/errores.py` |

- Los archivos se mueven con `git mv` y en el lugar viejo queda una reexportación de una línea (`from <ruta nueva> import *`), marcada con `ponytail:` para borrarla cuando nadie la importe. `app/__init__.py` sigue exponiendo `db` y `migrate`.
- Los nombres de archivo nuevos van en español; las capas (`domain`, `infrastructure`, `http`) quedan como en la constitución.

## Imports

- Un script reescribe los imports de `app/` con la tabla de arriba (`from app import db` pasa a `from app.shared.infrastructure.db import db`). Las pruebas y los scripts de la raíz del backend no se tocan: prueban que las reexportaciones funcionan.
- `test_capas.py` suma `test_app_importa_desde_shared`: falla si un archivo de `app/`, fuera de las reexportaciones, importa una ruta vieja.

## Errores de dominio

- `errores.py` de `shared/domain`: `ErrorDeDominio(Exception)` y sus hijas `NoEncontrado`, `ReglaDeNegocio` y `Conflicto`, sin dependencias.
- `errores.py` de `shared/http` registra un manejador por cada una: 404 `NOT_FOUND`, 422 `VALIDATION_ERROR` y 409 `CONFLICT`, con `str(error)` como mensaje y el formato de `api_error`. Flask elige el manejador más específico, así que el de `Exception` (500) no los tapa.
- `tests/test_errores_de_dominio.py`: una ruta de prueba lanza cada error y se compara código y cuerpo.

## Verificación

- El DDL de `db.metadata` (14 tablas, columnas, restricciones e índices) se compara antes y después del movimiento.
- Contrato, capas, el resto de `pytest`, `npm test` y `npm run build`.
