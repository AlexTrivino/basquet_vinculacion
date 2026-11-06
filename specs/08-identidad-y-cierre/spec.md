# Fase 8 · Backend: identidad y cierre

## Problema

Después de la fase 7, en `app/routes` quedan tres blueprints viejos: `usuario_bp` (el perfil propio, `/api/usuarios/me`, con el ORM en la ruta), `config_bp` (`/api/config/reglas-negocio`) y `health_bp` (`/api/health`). `app/models` y `app/utils` son reexportaciones de `app/shared` desde las fases 1 y 5, y `from app import db` también, solo para que las pruebas y los scripts viejos sigan importando. Por eso la prueba de capas todavía no es estricta para todo `app/`: lleva un trinquete de ORM en `app/routes` y una lista de rutas viejas permitidas.

## Qué entrega

- `app/modules/identidad/` con sus cuatro capas, como auspicios: `domain/usuario.py` (la entidad: identidad no tiene reglas propias), `application/casos_de_uso.py` (obtener el perfil y cambiar el nombre), `infrastructure/repositorio.py` (`RepositorioUsuarios`) y `http/usuarios.py` (blueprint `usuarios`, mismas rutas y nombres de vista).
- `/api/health` y `/api/config/reglas-negocio` pasan a `app/shared/http/` (`salud.py` y `reglas.py`): son de toda la app, no de un módulo.
- La autenticación (`token_required`, `identidad_opcional`) se queda en `app/shared/http/autenticacion.py`, donde está desde la fase 1. El plan la ponía en identidad, pero la usan todos los módulos, y un `http` no puede entrar a otro módulo.
- Se borran `app/routes`, `app/models` y `app/utils`, y la fábrica deja de exponer `db`: las pruebas, `seed_database.py`, `seeders/`, `scripts/` y los demás scripts de `backend/` importan de `app.shared`.
- `tests/test_capas.py` es estricta para todo `app/`: fuera de la fábrica solo hay `app/modules/<módulo>/<capa>` y `app/shared/<capa>`.
- Pruebas de los casos de uso con piezas falsas.

## Fuera de alcance

- Cambiar comportamiento. Se conservan, y quedan anotadas para otra especificación, estas rarezas de hoy:
  - `/api/usuarios/me` usa `token_required` sin roles, que no busca al usuario: una cuenta inactiva ve y cambia su perfil, y un token válido de un usuario que no existe llega a la ruta y recibe 404.
  - `PUT /api/usuarios/me` acepta un nombre vacío y no revisa su tipo ni su largo (en Postgres, más de 100 caracteres es un error de la base); lo demás del cuerpo se ignora, también el rol.
  - `/api/health` responde con su propio formato (`success`, `message` y `database`), no con `api_response`.
- Ejecutar los scripts de `backend/`: solo cambian sus imports (se comprueba que compilan y que cada nombre que importan de `app` existe).

## Criterios de aceptación

- [x] Las pruebas de contrato de usuarios, configuración y salud pasan sin regrabar `referencias.json`. Antes de mover nada se agregan 4 casos que faltaban y se graban con el código de `e69eac6`: quedan 15.
- [x] `test_capas.py` es estricta para todo `app/` y pasa; ya no tiene trinquete ni lista de rutas viejas.
- [x] Los casos de uso tienen pruebas con piezas falsas.
- [x] No queda ningún import de `app.models`, `app.utils`, `app.routes` ni `from app import db` en el repositorio.
- [x] README y `.agents/AGENTS.md` describen la estructura final.
- [x] `pytest`, `npm test` y `npm run build` en verde.
