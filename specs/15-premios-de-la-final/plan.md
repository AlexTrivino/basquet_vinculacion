# Fase 15 · Plan

## Base de datos

Una tabla nueva; no toca las que existen.

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.premios_final (
    id_premio_final SERIAL PRIMARY KEY,
    id_categoria    INTEGER NOT NULL REFERENCES public.categorias (id_categoria) ON DELETE CASCADE,
    tipo            VARCHAR(10) NOT NULL,
    id_jugador      INTEGER NOT NULL REFERENCES public.jugadores (id_jugador) ON DELETE CASCADE,
    url_foto        TEXT,
    ancho           INTEGER,
    alto            INTEGER,
    foco_x          NUMERIC(5, 2) NOT NULL DEFAULT 50,
    foco_y          NUMERIC(5, 2) NOT NULL DEFAULT 50,
    zoom            NUMERIC(3, 2) NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_premios_final_categoria_tipo UNIQUE (id_categoria, tipo),
    CONSTRAINT ck_premios_final_tipo CHECK (tipo IN ('mvp', 'defensa')),
    -- La foto es una sola cosa: o están el archivo y sus medidas, o no hay ninguno
    CONSTRAINT ck_premios_final_foto CHECK (
        (url_foto IS NULL AND ancho IS NULL AND alto IS NULL)
        OR (url_foto IS NOT NULL AND COALESCE(ancho, 0) > 0 AND COALESCE(alto, 0) > 0)
    ),
    CONSTRAINT ck_premios_final_foco_x CHECK (foco_x BETWEEN 0 AND 100),
    CONSTRAINT ck_premios_final_foco_y CHECK (foco_y BETWEEN 0 AND 100),
    CONSTRAINT ck_premios_final_zoom CHECK (zoom BETWEEN 1 AND 3)
);

-- Dueño el mismo de las demás tablas (el usuario del backend) aunque la cree otro rol desde Studio
ALTER TABLE public.premios_final OWNER TO postgres;
-- Como el resto de public: sin políticas, la API de Supabase con la llave anon no la lee; el backend, dueño, sí
ALTER TABLE public.premios_final ENABLE ROW LEVEL SECURITY;

COMMIT;
```

- Migración `b8d2e4f6a1c3_premios_final` (después de `f4c1d2e3a5b6`), idempotente: crea la tabla solo si `sa.inspect(bind).has_table('premios_final')` es falso y, solo en PostgreSQL, habilita RLS. Si la query ya corrió a mano, `flask db upgrade` (lo corre `deploy.sh`) solo anota la versión.
- Modelo `app/shared/infrastructure/modelos/premio_final.py` (`PremioFinal`), registrado en `modelos/__init__.py`.

## Backend (módulo competencia)

- `domain/podio.py`: `final_de(llaves)`, la final jugada de la categoría (`{id_partido, ronda, fecha, campeon, vice}`, cada equipo con su marcador), o `None` si no hay llave `F`, no se jugó o se definió por W.O.
- `domain/premios.py`: `TIPOS = ('mvp', 'defensa')`, `valoracion(linea)` (puntos + rebotes + asistencias + tapones, la misma del módulo de estadísticas), `candidatos(final, jugadores)` → `{'mvp': [...], 'defensa': [...]}` con cada candidato en la forma de una figura de los flyers (`jugador`, `equipo`, `linea`, `valoracion`) y ordenado de mejor a peor, y `validar_jugador(tipo, id_jugador, candidatos)` (`ReglaDeNegocio` con su mensaje). La foto reutiliza `podio.validar_dimensiones` y `podio.validar_encuadre`.
- `infrastructure/repositorio.py` (`RepositorioPartidos`):
  - `jugadores_del_partido(id_partido, id_torneo, ids_equipos)`: los jugadores con estadísticas en el partido, cada uno con su equipo y su dorsal de la plantilla del torneo.
  - `premios_final(id_categoria)` y `premio_final(id_categoria, tipo)`: `{id_jugador, foto}`, con `foto` `None` si no hay.
  - `elegir_premiado(id_categoria, tipo, id_jugador)`: crea el premio o cambia el jugador; si cambia, deja la foto en blanco (encuadre a 50 / 50 / 1) y devuelve la URL del archivo que hay que borrar.
  - `guardar_foto_premio`, `ajustar_foto_premio` y `borrar_foto_premio`, como las de la foto del podio pero sobre la fila del premio (que sigue ahí sin foto).
- `application/premios_final.py` (recibe repositorio, almacén, `imagenes` y unidad de trabajo por parámetro): `premios_del_torneo` (una entrada por categoría con la final jugada: categoría, final, candidatos y premios elegidos; un premio cuyo jugador ya no es candidato porque se corrigió la final no se cuenta), `elegir_jugador`, `subir_foto`, `ajustar_encuadre` y `quitar_foto`. Todo lo que escribe exige que la final esté jugada y el jugador sea candidato.
- `http/premios_final.py` (bajo `/api/torneos`, solo `super_admin`; el tipo en la ruta es `mvp` o `defensa` y otro es 404):
  - `GET /<id_torneo>/premios-final` → `{torneo, premios: [{categoria, final, candidatos: {mvp, defensa}, premios: {mvp, defensa}}]}`.
  - `PUT /categorias/<id_categoria>/premios-final/<tipo>` con `{"id_jugador": 12}` → 200 con el premio.
  - `POST /categorias/<id_categoria>/premios-final/<tipo>/foto` (multipart, campo `foto`) → 201 con el premio.
  - `PATCH …/foto` con `{"foco_x": 50, "foco_y": 35, "zoom": 1.2}` → 200. `DELETE …/foto` → 200.
  - Respuestas: 404 si el torneo o la categoría no existen o el premio no tiene foto; 422 `VALIDATION_ERROR` por una final no jugada, un jugador que no es candidato, subir una foto sin haber elegido, tipo, peso, medidas, una imagen que no se puede leer o un encuadre fuera de rango; 502 `STORAGE_ERROR` si el bucket no responde. Cambiar de jugador y reemplazar la foto borran el archivo anterior del bucket.
- La carpeta del bucket es `premios/<id_torneo>/<id_categoria>/`.
- Pruebas: `tests/test_premios_final.py` con un almacén falso y una final de verdad (candidatos y su orden, elección, cambio de jugador, foto y sus rechazos, permisos, finales por W.O. y sin jugar) y casos de contrato de las rutas nuevas (en la base de contrato no hay una final con llaves jugada: los casos cubren permisos, 404 y los 422 de «final no jugada»; los caminos felices los cubre el archivo propio).

## Frontend (módulo flyers)

- `api/flyers.api.ts`: tipos del premio, `getPremiosFinal`, `elegirPremiado`, `subirFotoPremio`, `ajustarFotoPremio`, `quitarFotoPremio` y `clavePremios`. El candidato tiene la forma de `FiguraFlyer`, así que sirven `numerosDe`, `HeroeFigura` y las demás piezas de los flyers de figuras.
- `components/FlyerPodio.tsx`: el cuerpo del flyer del podio pasa a `MarcoBase` (fondo, nombre, dato, números y pie, con los mismos píxeles de antes) y `MarcoPodio` le pone encima el encabezado, la franja, el héroe y la palabra del puesto; `FlyerPodio` usa `MarcoPodio` y `FlyerPremio` usa `MarcoBase` con lo de arriba a su manera. La franja de números admite de 1 a 5 columnas.
- `components/FlyerPremio.tsx`: el flyer de un premio (`mvp` o `defensa`) con lo de arriba en renglones propios que no se pisan (encabezado con la categoría y la copa, rótulo, palabra y, al final, el héroe: la foto del premio con su encuadre y, si no hay, `HeroeFigura` con la foto del jugador o la silueta), para que nada tape la foto. `aspectoDelPremio` da la proporción de su marco al editor de recorte.
- `components/AccionesPremio.tsx`: debajo del flyer, el selector del jugador y la foto (subir, cambiar, ajustar recorte, quitar), con el editor de la fase 14.
- `textosPremio.ts`: el resultado de la final desde el equipo del premiado, los números de cada flyer, la etiqueta de cada candidato del selector y la descripción para Instagram.
- `components/EstudioFlyers.tsx`: los tipos `mvp` y `defensa` (torneo y categoría; sin elegir, el último torneo finalizado) y su flyer con sus acciones; el encuadre que se está ajustando es un borrador con clave (tipo, categoría y jugador) para que el flyer lo muestre en vivo.
- Pruebas: el flyer (foto del premio, foto del jugador y silueta; números en 0; nombres largos), el selector y las acciones (elegir, subir sin elegir, quitar, errores), los textos y el estudio con la API simulada. Se mantienen las del flyer del podio, que no debe cambiar un píxel.

## Bucket

- No hay que cambiar nada: el backend sube con la llave `service_role` al bucket público de siempre, ahora en la carpeta `premios/`. Las mismas notas de la fase 14: no ponerle al bucket tipos ni peso máximo y revisar que no tenga políticas de escritura para `anon` ni `authenticated`.

## Comprobación

- `pytest` en Python 3.12 y 3.13, con el contrato de los casos nuevos (solo se agregan líneas a `referencias.json`) y la migración y la query de producción probadas en PostgreSQL local, dos veces seguidas.
- `npm test` (tipos, fronteras y pruebas), build y prueba de humo.
- Capturas en un navegador real, con datos de ejemplo rotulados como tales, de los dos flyers en estados y redes con y sin foto, con un nombre largo y con números en 0, y del Estudio con el selector, el editor de recorte y la subida.
