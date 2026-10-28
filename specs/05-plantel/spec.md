# Fase 5 · Backend: plantel

## Problema

Equipos, jugadores y el buscador del visor viven en tres blueprints (`equipo_bp`, `jugador_bp` y `visor_bp`, 23 rutas), cuatro servicios (`equipo_service`, `jugador_service`, `jugador_profile_service` y `visor_service`) y dos esquemas. La regla más delicada del sistema, quién ve los datos personales de un jugador, está escrita dentro de las rutas, igual que quién puede gestionar un equipo o un jugador. Las rutas de archivos (logo, banner, foto, cédula y acta) son copias casi iguales entre sí.

## Qué entrega

- `app/modules/plantel/` con sus cuatro capas:
  - `domain/`: `equipo.py` (la entidad, quién lo gestiona y el cupo de equipos por delegado) y `jugador.py` (la entidad, la edad, quién ve los datos personales y qué delegado gestiona a un jugador).
  - `application/`: `equipos.py` y `jugadores.py` (también el perfil y las consultas del visor).
  - `infrastructure/repositorio.py`: `RepositorioEquipos` y `RepositorioJugadores`, con las consultas de hoy.
  - `http/`: los blueprints `equipos`, `jugadores` y `visor` (mismos prefijos, rutas y nombres de vista) y los esquemas; las rutas de archivos comparten una función por tipo.
- `shared`:
  - `domain/errores.py`: `SinPermiso`, que sale como 403 `FORBIDDEN`.
  - `domain/reglas.py` y `domain/textos.py`: las reglas de negocio configurables y la normalización a mayúsculas, que usan varios módulos (eran `utils/business_rules.py` y `utils/text_utils.py`, que quedan como reexportaciones).
  - `infrastructure/almacenamiento.py`: `borrar_en_segundo_plano`, para los archivos viejos de los jugadores.
  - `http/paginacion.py`: `pagina_pedida` acepta el tamaño por defecto (el visor usa 24).
- Pruebas de las reglas y de los casos de uso con piezas falsas.
- Se retiran `equipo_bp`, `jugador_bp`, `visor_bp`, los cuatro servicios y los dos esquemas.

## Fuera de alcance

- Cambiar comportamiento. Se conservan, y quedan anotadas para otra especificación, estas rarezas de hoy:
  - Un `PUT` de equipo acepta los estados `aprobado`, `rechazado` y `pendiente`, que la base rechaza: responde 500.
  - El super_admin no puede registrar equipos si ya tiene uno activo a su nombre (el cupo es el de un delegado), y reactivar un equipo exige que su dueño no tenga ninguno activo (usa 1 fijo, no el cupo configurable).
  - Al subir un logo o un banner, el anterior se borra antes de validar el nuevo.
  - En la lista de equipos de administración filtrada por torneo, un equipo inscrito en dos categorías cuenta dos veces en el total de la paginación.
  - El buscador de jugadores por cédula (`/buscar`) consulta las plantillas con `plantilla_service` hasta la fase 6.
- `seed_database.py`, `seeders/` y los scripts siguen usando los modelos compartidos.

## Criterios de aceptación

- [x] Las pruebas de contrato de equipos, jugadores y visor pasan sin regrabar `referencias.json`. Antes de mover nada se agregan 31 casos que faltaban y se graban con el código de `7656270`: quedan 140.
- [x] `test_capas.py` pasa con el módulo y con `utils/business_rules` y `utils/text_utils` entre las rutas viejas que nadie de `app/` usa.
- [x] Las reglas tienen pruebas sin base (quién ve los datos personales, qué delegado gestiona a un jugador o un equipo, el cupo de equipos y la edad), y los casos de uso, con piezas falsas.
- [x] Nada importa las rutas, servicios ni esquemas retirados, y el trinquete de ORM en `app/routes` baja.
- [x] README y `.agents/AGENTS.md` describen el módulo.
- [x] `pytest`, `npm test` y `npm run build` en verde.
