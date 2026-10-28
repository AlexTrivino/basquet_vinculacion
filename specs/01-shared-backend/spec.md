# Fase 1 · Backend: shared

## Problema

Lo que usan todos los módulos está repartido: la conexión `db` en `app/__init__.py`, los 14 modelos en `app/models` y Storage, respuestas, paginación, autenticación y manejo de errores en `app/utils`. Los módulos nuevos necesitan importarlo desde un solo lugar, ordenado por capas, y el dominio necesita errores propios que no dependan de Flask.

## Qué entrega

- `app/shared/domain/errores.py`: `NoEncontrado`, `ReglaDeNegocio` y `Conflicto`, en Python puro.
- `app/shared/infrastructure/`: `db.py` (`db`, `migrate` y el seguro de `drop_all`), `modelos/` (los 14 modelos) y `almacenamiento.py` (Storage de Supabase).
- `app/shared/http/`: `respuestas.py`, `paginacion.py`, `autenticacion.py` y `errores.py` (los manejadores de hoy más la traducción de los errores de dominio).
- Todo `app/` importa desde `app/shared`. Las rutas viejas (`from app import db`, `app.models`, `app.utils.storage`, `app.utils.response`, `app.utils.pagination`, `app.utils.auth_middleware` y `app.utils.error_handlers`) quedan como reexportaciones para las pruebas, los scripts y las migraciones.

## Fuera de alcance

- Cambiar comportamiento, el esquema de la base o las migraciones.
- `business_rules.py` y `text_utils.py`: se mueven con su módulo.
- Usar los errores nuevos en el código viejo.

## Criterios de aceptación

- [x] Las 405 pruebas de contrato pasan sin regrabar `referencias.json`.
- [x] Ningún archivo de `app/`, salvo las reexportaciones, importa una ruta vieja; una prueba en `test_capas.py` lo exige.
- [x] Las pruebas existentes pasan sin tocarlas: siguen importando las rutas viejas.
- [x] `NoEncontrado` sale como 404 `NOT_FOUND`, `ReglaDeNegocio` como 422 `VALIDATION_ERROR` y `Conflicto` como 409 `CONFLICT`, con el mensaje del error. Son los códigos más usados hoy para cada caso; donde hoy sale otro (por ejemplo 400), el `http` del módulo lo traduce explícito y el contrato lo vigila.
- [x] El esquema que declaran los modelos no cambia: el DDL de las 14 tablas es idéntico antes y después.
- [x] `pytest`, `npm test` y `npm run build` en verde.
