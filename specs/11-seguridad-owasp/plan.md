# Fase 11 · Plan

## Archivos

| Arreglo | Archivos |
| --- | --- |
| Archivos del bucket | `plantel/http/esquemas.py` (sin `url_*` en el alta y la edición), `shared/infrastructure/almacenamiento.py` (`clave_del_bucket`, `_ESPERA`, log con `logging` para que sirva en el hilo) |
| Inscripciones ajenas | `inscripciones/application/inscripciones.py` (`crear` y `reinscribir` con `id_usuario` y `rol`), `inscripciones/http/inscripciones.py` |
| Datos personales por cédula | `plantel/application/jugadores.py` (`ve_privados`, que también usa la ficha), `plantel/http/esquemas.py` (`JugadorParaVincularSchema`), `plantel/http/jugadores.py`; en el frontend, `GestorPlantilla.tsx` (teléfono vacío al vincular) |
| Cuentas inactivas | `identidad/http/usuarios.py`; `auth/components/LoginForm.tsx` (muestra `message`) |
| JWT | `shared/http/autenticacion.py` |
| Marcado en el PDF | `estadisticas/http/planilla_pdf.py` |
| Inscripción completa | `inscripciones/application/inscripciones.py` (`crear_completa`), `inscripciones/http/inscripciones.py` (400 y `ErrorDeDominio` sin pasar por el 500) |
| Scripts | `reset_database.py`, `clean_partidos.py`, `seed_database.py`; se borran `confirm.txt`, `seed_log.txt` y `test_error.py` |
| Registro y cabeceras | `shared/http/seguridad.py` (nuevo), `app/__init__.py` (`ProxyFix` con un proxy) |
| Errores | `shared/http/errores.py` (413 y los demás `HTTPException`), `isdecimal()` en `torneos/http/torneos.py`, `estadisticas/http/lideres.py`, `competencia/http/fase_final.py` y la inscripción completa; `isascii()` en la cédula y el teléfono |
| Dependencias | `backend/requirements.txt` (también se fijan `pillow` y `chardet`, que trae reportlab), `frontend/package.json` y `package-lock.json` (`npm audit fix` con npm 11: el de npm 10 falla con `edgesOut`; React Router 7.18.5), `deploy.sh` (`npm ci`) |

`Equipo.inscripciones` se ordena por `id_inscripcion`: el orden quedaba a cargo de la base, y con el SQLite de Python 3.12 (el del servidor) dos casos de contrato salían en otro orden. Es el orden con el que están grabados.

## Referencias de contrato que cambian

- `POST /api/inscripciones · del2 · equipo ajeno`: 201 → 403.
- `POST /api/inscripciones/completa · del3 · torneo que no es número`: 500 → 400.
- `GET /api/jugadores/buscar?cedula=1310000005&id_torneo=1 · del1` y la misma con `id_categoria=2`: sin teléfono, correo, documentos, plantillas ni fechas de alta.
- `GET /api/usuarios/me · inactivo`: 200 → 403; `· fantasma`: 404 → 401.
- `PUT /api/usuarios/me · del1 · nombre vacío`: 200 → 422.

Casos nuevos: el buscador y el 409 con un jugador ajeno, `url_cedula` en el alta y en la edición (422), la reinscripción de un equipo ajeno (403), la inscripción completa en un torneo en curso (422), un nombre de más de 100 caracteres (422) y `?id_categoria=²` en los líderes (200, se ignora). Quedan 507 casos.

## Pruebas

- `tests/test_seguridad.py`: el borrado de archivos (claves ajenas, `..`, consultas, otra web), el hilo de borrado sin contexto de Flask, el 413 y el 415, las cabeceras y la línea del log, el HS256 con un `kid` del JWKS (hoy 500 por un `TypeError` de PyJWT), la planilla con marcado en los nombres y los scripts sin terminal (no borran ni siembran nada).
- `GestorPlantillaTelefono.test.ts`: el teléfono vacío pasa y el incompleto no.
- Cada prueba nueva se corrió contra el código anterior y falla.
- `pytest` con Python 3.12 (el del servidor) y 3.13, `npm test`, `npm run build` y la prueba de humo de 42 rutas contra la base de `6294037`.
