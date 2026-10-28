# Fase 2 · Backend: auspicios (piloto)

## Problema

Los cuatro endpoints de `/api/patrocinadores` hacen todo dentro de la ruta: validan el formulario, suben y borran logos en Storage, leen y escriben con el ORM y confirman la transacción. Es el módulo más chico y sin reglas de negocio, así que sirve de molde: si la receta funciona aquí, se repite en los demás.

## Qué entrega

- `app/modules/auspicios/` con sus cuatro capas:
  - `domain/patrocinador.py`: la entidad `Patrocinador` (dataclass). Auspicios no tiene reglas, así que el dominio es solo la entidad.
  - `application/casos_de_uso.py`: `listar`, `obtener`, `crear`, `actualizar` y `eliminar`, que reciben el repositorio, el almacén de archivos y la unidad de trabajo por parámetro.
  - `infrastructure/repositorio.py`: `RepositorioPatrocinadores` sobre el modelo compartido.
  - `http/`: el blueprint `patrocinadores` (mismo `url_prefix`, mismas rutas y nombres de vista) y su esquema marshmallow.
- `app/shared/infrastructure/unidad_de_trabajo.py`: `confirmar` y `revertir` sobre `db.session`, para todos los módulos.
- Pruebas de los casos de uso con piezas falsas, sin base de datos ni Storage.
- `app/routes/patrocinador_bp.py` y `app/schemas/patrocinador_schema.py` se retiran: nadie más los usa.
- La estimación de las fases que faltan se recalibra con lo que costó el piloto.

## Fuera de alcance

- Cambiar comportamiento. Se conservan, y quedan anotadas para otra especificación, dos rarezas de hoy:
  - Borrar un patrocinador que auspicia un torneo responde 500 (la relación no borra en cascada).
  - Al cambiar el logo, el viejo se borra de Storage antes de confirmar; si la base falla, el patrocinador queda apuntando al logo viejo ya borrado.
- La relación patrocinador–torneo (`patrocinadores_torneos`): ningún endpoint la usa hoy.

## Criterios de aceptación

- [x] Las pruebas de contrato de `/api/patrocinadores` pasan sin regrabar `referencias.json`. Antes de mover nada se agregan dos casos que faltaban (`PUT` con un logo que no es imagen y con imagen promocional) y se graban con el código de `946340b`: quedan 20.
- [x] `test_capas.py` pasa con el módulo: `domain` y `application` sin Flask, SQLAlchemy ni marshmallow.
- [x] Los casos de uso tienen pruebas sin base: crear compensa el logo subido si la base falla, actualizar reemplaza el logo, eliminar borra el logo solo si la base confirma, y lo que no existe da `NoEncontrado`.
- [x] Nada importa `app.routes.patrocinador_bp` ni `app.schemas.patrocinador_schema`; el trinquete de ORM en `app/routes` baja de 61 a 50.
- [x] README y `.agents/AGENTS.md` describen el módulo.
- [x] `pytest`, `npm test` y `npm run build` en verde.
