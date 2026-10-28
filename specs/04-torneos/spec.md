# Fase 4 · Backend: torneos

## Problema

Los torneos y sus categorías se gestionan en `torneo_bp` (11 rutas), `categoria_bp` (2), `torneo_service`, `categoria_service` y dos esquemas. Sus reglas están repartidas entre las rutas, los servicios y el modelo: qué estados se ven en la parte pública, cuándo se anula o se da de baja un torneo, y que la fecha de fin no quede antes del inicio. Además, competencia todavía busca el torneo con `torneo_service`.

## Qué entrega

- `app/modules/torneos/` con sus cuatro capas:
  - `domain/torneo.py`: las entidades `Torneo` y `Categoria`, qué estados son vigentes (`vigente`) y la regla de las fechas (`validar_fechas`).
  - `application/casos_de_uso.py`: listar torneos (público, de administración y abiertos a inscripción), obtener, crear, actualizar, dar de baja, anular y subir el calendario; listar, obtener, agregar y eliminar categorías.
  - `infrastructure/repositorio.py`: `RepositorioTorneos` sobre los modelos compartidos.
  - `http/`: los blueprints `torneos` y `categorias` (mismos prefijos, rutas y nombres de vista) y los esquemas marshmallow.
- Competencia deja `torneo_service`: lee la fila con el modelo compartido y le pregunta a la application de torneos si está vigente.
- La ruta de líderes (`/api/torneos/<id>/lideres`) es de estadísticas: queda sola en `app/routes/lideres_bp.py` hasta la fase 7 y busca el torneo con el módulo nuevo.
- Pruebas de las reglas y de los casos de uso con piezas falsas.
- Se retiran `torneo_bp`, `categoria_bp`, `torneo_service`, `categoria_service`, `torneo_schema` y `categoria_schema`.

## Fuera de alcance

- Cambiar comportamiento. Se conservan, y quedan anotadas para otra especificación, estas rarezas de hoy:
  - Una categoría con un género que no existe llega a la base, que la rechaza: responde 500. Si venía al crear un torneo, tampoco se crea el torneo.
  - Al subir otro calendario, el anterior queda en Storage.
  - Agregar una categoría con un campo de más (por ejemplo `formato`) responde 422, y con un objeto vacío, 400.
  - Dar de baja un torneo anulado lo deja inactivo, y un `PUT` con `estado: anulado` también anula.
- El scope `Torneo.activos()` del modelo compartido queda como está.

## Criterios de aceptación

- [x] Las pruebas de contrato de torneos y categorías pasan sin regrabar `referencias.json`. Antes de mover nada se agregan 15 casos que faltaban y se graban con el código de `27d6559`: quedan 68.
- [x] `test_capas.py` pasa con el módulo: `domain` y `application` sin Flask, SQLAlchemy ni marshmallow, y competencia entra a torneos solo por su application.
- [x] Las reglas tienen pruebas sin base (estados vigentes, fechas, baja, anulación y categorías con equipos inscritos), y los casos de uso, con piezas falsas.
- [x] Nada importa las rutas, servicios ni esquemas retirados, y el trinquete de ORM en `app/routes` baja de 41 a 39.
- [x] README y `.agents/AGENTS.md` describen el módulo.
- [x] `pytest`, `npm test` y `npm run build` en verde.
