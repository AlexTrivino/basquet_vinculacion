# Fase 8 · Plan

## Capas

| Capa | Archivo | Qué tiene |
| --- | --- | --- |
| domain | `usuario.py` | `Usuario` (id, nombre, correo, rol, estado y fechas) |
| application | `casos_de_uso.py` | `obtener` y `cambiar_nombre` (solo el nombre: el rol, el correo y el estado no se tocan desde el perfil) |
| infrastructure | `repositorio.py` | `RepositorioUsuarios`: `obtener` y `actualizar` sobre el modelo compartido |
| http | `usuarios.py` | el blueprint `usuarios` (`/api/usuarios/me`, GET y PUT) |

`app/shared/http/salud.py` (blueprint `health`) y `app/shared/http/reglas.py` (blueprint `config`) son los blueprints de `health_bp` y `config_bp`, movidos tal cual.

## Reparto de lo que hoy hace cada ruta

- El orden de los errores no cambia: el `PUT` busca primero al usuario (404 `NOT_FOUND` por `NoEncontrado`) y después lee el cuerpo (400 `BAD_REQUEST` si falta el nombre, lo arma `http`).
- La respuesta es la de `Usuario.to_dict()`, armada en `http` desde la entidad.

## Retiro de lo viejo

- `app/__init__.py` registra los blueprints nuevos e importa `db` y `migrate` dentro de `create_app`, así `from app import db` deja de existir.
- Se borran `app/routes/` (los tres blueprints), `app/models/` (15 reexportaciones de los modelos) y `app/utils/` (7 reexportaciones de `shared` y su `__init__`).
- Las 20 pruebas y scripts que importaban de ahí pasan a `app.shared.infrastructure.db`, `app.shared.infrastructure.modelos` y `app.shared.infrastructure.almacenamiento`. Los scripts no se ejecutan (algunos borran o recrean tablas); se comprueba que compilan y que lo que importan existe.
- `tests/test_capas.py`: sin el trinquete de ORM en `app/routes` ni la lista de rutas viejas, y con una prueba nueva que falla si aparece un archivo fuera de la fábrica, de un módulo o de `shared`.
- README, `backend/README.md` (también la respuesta de `/api/health`, que no era la real), `.agents/AGENTS.md`, la guía de desarrollo y la skill de backend apuntan a las rutas nuevas.

## Resultado

- Las 43 líneas de las rutas viejas (sin docstrings) pasaron a 76: 58 en las cuatro capas de identidad y 18 en `shared/http`, más 31 de pruebas y 4 casos de contrato. Además se borraron 22 líneas de reexportaciones y 20 archivos dejaron de usarlas. La recalibración de la fase 2 contaba 110 líneas más el cierre: la autenticación ya había pasado a `shared` en la fase 1, así que la fase quedó por debajo de las 4–6 h estimadas.
