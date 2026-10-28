# Fase 0 · Plan

## Pruebas de contrato (`backend/tests/contrato/`)

- `datos.py` siembra una base SQLite en memoria con datos representativos y ids fijos: usuarios por rol (super_admin, tres delegados, visor y una cuenta inactiva), un torneo en curso con una categoría de grupo único terminada (llaves listas) y otra de tres equipos a medio jugar, un torneo programado con inscripciones pendiente, borrador, rechazada y aprobadas, uno finalizado y uno anulado; equipos (dos inactivos), jugadores con todos sus datos, plantillas, partidos en todos los estados, actas, sanciones, auspicios y documentos. Todas las fechas son anteriores al 28/10/2026, así nunca coinciden con el día en que corren las pruebas.
- `casos.py` es la lista de casos: método, ruta con su query, rol y cuerpo (JSON, formulario o archivos). Por cada ruta y método se agregan solas una variante sin token (401 en las protegidas) y, si la ruta solo tiene casos de admin, otra con un delegado (403). Hay tokens especiales: usuario inexistente, token vencido y firma inválida.
- `test_contrato.py`:
  - Los casos de lectura comparten una base sembrada una vez; cada escritura usa una base nueva, así el orden no importa.
  - Tokens HS256 firmados con el secreto de pruebas (el mismo camino que usan las pruebas existentes). Las variables de Supabase se fijan en la prueba, así el `.env` de cada máquina no cambia las respuestas.
  - `urllib.request.urlopen` reemplazado por un falso: Storage nunca sale a la red y el JWKS falla enseguida, como hoy en las pruebas.
  - Cada referencia guarda el código HTTP, el JSON, las llamadas a Storage (subidas y borrados) y, en las escrituras, cuántas filas ganó o perdió cada tabla.
  - Normalización: cualquier texto que empieza con la fecha de hoy (local o UTC, porque SQLite guarda `now()` en UTC) pasa a `<hoy>`, `edad` y el texto "tiene N años" a `<edad>` y el prefijo aleatorio de los archivos subidos a `<uuid>`. La lista `delegados_autorizados` se ordena porque sale de un set. Del PDF de la planilla solo se compara el tipo y el nombre del adjunto.
  - `test_todas_las_rutas_tienen_caso` recorre `app.url_map` y falla si una ruta y método no tiene caso; `test_no_hay_referencias_sin_caso` falla si queda una referencia huérfana.
- `referencias.json` guarda la respuesta normalizada de cada caso (405 casos). Se regenera con `ACTUALIZAR_CONTRATO=1 pytest tests/contrato`; un cambio en ese archivo durante la migración es una señal de alarma y se revisa línea por línea.
- Comportamientos raros grabados tal cual (arreglarlos es otra especificación):
  - `POST /api/sanciones/` responde 500 en SQLite: el servicio pasa la fecha como texto a una columna Date. En Postgres funciona.
  - `DELETE /api/patrocinadores/1` responde 500 cuando el patrocinador auspicia un torneo: la relación no borra en cascada y la columna no admite nulos. Pasa igual en Postgres.
  - `PUT /api/inscripciones/<id>/retirar` borra los partidos programados del equipo en todas las categorías del torneo, no solo en la de esa inscripción.
  - `POST /api/inscripciones` no comprueba que el delegado sea dueño del equipo que inscribe.

## Prueba de capas (`backend/tests/test_capas.py`)

- Lee los imports con `ast` (biblioteca estándar).
- Estricto: en `app/modules/*/domain` y `app/shared/domain`, nada de Flask, SQLAlchemy, marshmallow, boto3, jwt ni de otras capas; `application` solo importa su `domain` y `app.shared.domain`; un módulo solo entra en otro por su `application`.
- Trinquete: cuenta, con `ast`, las líneas de `app/routes` que usan `db.session` o `.query` (61 hoy) y falla si cambian: si bajan, se baja el número en el mismo commit.

## Prueba de fronteras (`frontend/src/fronteras.test.ts`)

- Lee el código con `import.meta.glob` (sin tipos de Node ni dependencias nuevas) y resuelve imports relativos y `@/`.
- Estricto: un módulo entra en otro solo por `@/modules/<nombre>`; `shared` no importa `modules` ni `app`; los módulos no importan `app`; sin ciclos entre módulos.
- Trinquete: los imports a archivos internos de otra feature (33 hoy) no pueden cambiar: si bajan, se baja el número en el mismo commit.

## Alias `@/`

- `paths` en `tsconfig.json`, `resolve.alias` en `vite.config.ts` y `vitest.config.ts`, apuntando a `src/`.
