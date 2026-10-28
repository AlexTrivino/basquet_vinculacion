# Fase 6 · Backend: inscripciones

## Problema

Las inscripciones y las plantillas viven en dos blueprints (`inscripcion_bp` y `plantilla_bp`, 18 rutas), dos servicios (`inscripcion_service` y `plantilla_service`) y dos esquemas. Las reglas de cuándo un equipo se puede inscribir, del borrador único, del envío a revisión (comprobante y plantilla de 5 a 18 con dorsales distintos) y de qué jugador entra en una plantilla están repartidas entre rutas y servicios. `inscripcion_bp` además arma a mano el alta completa de un club y la validación del envío, con consultas al ORM dentro de la ruta. El borrado en cascada de una inscripción (rechazo, borrador eliminado y purga) mezcla la base con Storage.

## Qué entrega

- `app/modules/inscripciones/` con sus cuatro capas:
  - `domain/`: `inscripcion.py` (la entidad, cuándo se acepta una inscripción, el borrador único, el cupo de un club nuevo, el envío a revisión y el retiro) y `plantilla.py` (la entidad, la edad deportiva, la edad de la categoría, el cupo de la plantilla y quién ve los datos personales de la nómina).
  - `application/`: `inscripciones.py` y `plantillas.py`.
  - `infrastructure/repositorio.py`: `RepositorioInscripciones` y `RepositorioPlantillas`, con las consultas de hoy; el borrado en cascada devuelve los archivos que quedan sin dueño y el caso de uso los borra de Storage.
  - `http/`: los blueprints `inscripciones` y `plantillas` (mismos prefijos, rutas y nombres de vista) y los esquemas.
- El buscador de jugadores por cédula (`/api/jugadores/buscar`) deja `plantilla_service`: plantel pregunta por la plantilla del jugador en el torneo con su propio repositorio, sobre el modelo compartido.
- Pruebas de las reglas y de los casos de uso con piezas falsas.
- Se retiran `inscripcion_bp`, `plantilla_bp`, los dos servicios y los dos esquemas.

## Fuera de alcance

- Cambiar comportamiento. Se conservan, y quedan anotadas para otra especificación, estas rarezas de hoy:
  - Toda alta de inscripción revisa el borrador abierto del dueño del equipo, aunque la nueva entre como pendiente; el borrador único responde 422 en `POST /api/inscripciones` y en `/reinscribir`, y 409 en `/completa`, donde el cupo de equipos tiene otro mensaje que en `/api/equipos`.
  - `PATCH /estado` acepta cualquier cambio entre los cuatro estados, también desde `retirado`, y rechazar borra la inscripción en vez de guardarla como rechazada.
  - `PATCH /editar` acepta una categoría de otro torneo y responde 400 a todo, también a una inscripción que no existe.
  - El envío a revisión cuenta la plantilla del equipo en todo el torneo, no solo en la categoría, y sus errores salen como `UNPROCESSABLE_ENTITY`.
  - Subir otro comprobante no borra el anterior de Storage; el borrado en cascada borra los archivos antes de confirmar.
  - `/completa` con un torneo o una categoría que no son número responde 500 después de revisar el cupo.
  - Reinscribir clona la plantilla de la inscripción anterior con las entradas inactivas incluidas.
  - En la plantilla, la edad es la diferencia de años (la del perfil del jugador es la cumplida) y el dorsal repetido se busca por categoría al agregar y en todo el torneo al cambiarlo.
- `seed_database.py`, `seeders/` y los scripts siguen usando los modelos compartidos.

## Criterios de aceptación

- [x] Las pruebas de contrato de inscripciones y plantillas pasan sin regrabar `referencias.json`. Antes de mover nada se agregan 27 casos que faltaban y se graban con el código de `43b4834`: quedan 123.
- [x] `test_capas.py` pasa con el módulo y nada importa las rutas, servicios ni esquemas retirados.
- [x] Las reglas tienen pruebas sin base (cuándo se inscribe un equipo, el borrador único, el envío a revisión, el retiro, la edad deportiva, el cupo de la plantilla y quién ve la nómina completa), y los casos de uso, con piezas falsas.
- [x] El trinquete de ORM en `app/routes` baja.
- [x] README y `.agents/AGENTS.md` describen el módulo.
- [x] `pytest`, `npm test` y `npm run build` en verde.
