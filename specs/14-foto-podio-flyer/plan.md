# Fase 14 · Plan

## Base de datos

Una tabla nueva; no toca las que existen.

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.fotos_podio (
    id_foto_podio SERIAL PRIMARY KEY,
    id_categoria  INTEGER NOT NULL REFERENCES public.categorias (id_categoria) ON DELETE CASCADE,
    id_equipo     INTEGER NOT NULL REFERENCES public.equipos (id_equipo) ON DELETE CASCADE,
    url_foto      TEXT NOT NULL,
    ancho         INTEGER NOT NULL CHECK (ancho > 0),
    alto          INTEGER NOT NULL CHECK (alto > 0),
    foco_x        NUMERIC(5, 2) NOT NULL DEFAULT 50 CHECK (foco_x BETWEEN 0 AND 100),
    foco_y        NUMERIC(5, 2) NOT NULL DEFAULT 50 CHECK (foco_y BETWEEN 0 AND 100),
    zoom          NUMERIC(3, 2) NOT NULL DEFAULT 1 CHECK (zoom BETWEEN 1 AND 3),
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_fotos_podio_categoria_equipo UNIQUE (id_categoria, id_equipo)
);

-- Dueño el mismo de las demás tablas (el usuario del backend) aunque la cree otro rol desde Studio
ALTER TABLE public.fotos_podio OWNER TO postgres;
-- Como el resto de public: sin políticas, la API de Supabase con la llave anon no la lee; el backend, dueño, sí
ALTER TABLE public.fotos_podio ENABLE ROW LEVEL SECURITY;

COMMIT;
```

- Migración `f4c1d2e3a5b6_fotos_podio` (después de `e7a1b5c3d9f2`), idempotente: crea la tabla solo si `sa.inspect(bind).has_table('fotos_podio')` es falso y, solo en PostgreSQL, habilita RLS. Si la query ya corrió a mano, `flask db upgrade` (lo corre `deploy.sh`) solo anota la versión; si no corrió, la migración hace lo mismo.
- Modelo `app/shared/infrastructure/modelos/foto_podio.py`.

## Backend (módulo competencia)

- `domain/podio.py`: `validar_dimensiones(ancho, alto)` y `validar_encuadre(foco_x, foco_y, zoom)`, con los límites como constantes y `ReglaDeNegocio` con mensajes para el admin.
- `shared/infrastructure/imagenes.py`: `normalizar_foto(stream)` → `(bytes, ancho, alto, ancho_original, alto_original)` con Pillow (ya está en `requirements.txt`): `Image.MAX_IMAGE_PIXELS = 40_000_000`, `ImageOps.exif_transpose`, RGB, `thumbnail((2560, 2560))` y WebP al 85 % sin EXIF. Pillow vive en infraestructura: el dominio solo recibe números.
- `shared/infrastructure/almacenamiento.py`: `MAX_FOTO_PODIO = 4 MB`.
- `application/fotos_podio.py`: `subir_foto` (el equipo tiene que estar en el podio de la categoría; tipo y peso con `validar_archivo`; normaliza; dimensiones del original; sube a `podios/<id_torneo>/<id_categoria>/`; guarda o reemplaza la fila y borra el archivo anterior en segundo plano), `ajustar_encuadre` y `quitar_foto`.
- `http` (bajo `/api/torneos`, solo `super_admin`):
  - `POST /categorias/<id_categoria>/podio/<id_equipo>/foto` (multipart, campo `foto`) → 201 con la foto.
  - `PATCH /categorias/<id_categoria>/podio/<id_equipo>/foto` con `{"foco_x": 50, "foco_y": 35, "zoom": 1.2}` → 200.
  - `DELETE /categorias/<id_categoria>/podio/<id_equipo>/foto` → 200.
  - `GET /<id_torneo>/podios` (público, como el de la portada): los podios de ese torneo, cada puesto con su foto y su encuadre (`foto`) o la foto del equipo (`url_foto_equipo`), para el estudio. `GET /podios` (la portada) suma los mismos dos campos.
  - Respuestas: 422 `VALIDATION_ERROR` por tipo, peso, medidas, una imagen que no se puede leer, un encuadre fuera de rango o un equipo que no está en el podio; 404 si la categoría no existe o el equipo no tiene foto; 502 `STORAGE_ERROR` si el bucket no responde. Reemplazar la foto devuelve el encuadre a 50 / 50 / 1 y borra el archivo anterior; quitarla no exige que el equipo siga en el podio, para poder limpiar tras corregir una final.
- Pruebas: `tests/test_fotos_podio.py` con un almacén falso (los rechazos, el reemplazo que borra el anterior, la foto sin EXIF y a 2560 px) y los casos de contrato de las cuatro rutas.

## Frontend

- `modules/partidos`: `getPodiosDelTorneo` y los tipos `FotoDelPodio` y `PodiosDelTorneo`; `podio.ts` con `partidoClave` y `fechaCorta`, que salieron de `SeccionPodio` para que los lea también el flyer.
- `modules/flyers`: el tipo `podio` en `EstudioFlyers` (torneo y categoría; sin elegir, sugiere el último torneo finalizado); `FlyerPodio` con el diseño de la ruta 1 en estados (márgenes de 250 px) y redes; `EditorEncuadre` (arrastre con pointer events, zoom con un `input range`, flechas del teclado, «Centrar»), `AccionesFotoPodio` (subir, cambiar, ajustar y quitar, con el borrador del encuadre que el flyer muestra en vivo) y `foto.ts`, la validación del navegador (`createImageBitmap` para medirla y `canvas.toBlob` para reducirla).
- La imagen del editor no es arrastrable como archivo (`draggable=false`): si lo fuera, el navegador cancelaría el puntero a mitad del gesto y solo se aplicaría el primer movimiento.
- El flyer pinta la foto con `object-fit: cover`, `object-position: X% Y%` y `transform: scale(zoom)` con el origen en el foco: el mismo encuadre sirve en 9:16 y en 4:5.
- La descarga sigue con html-to-image: las fotos salen del bucket público con CORS, como los escudos que ya van en los PNG.
- Pruebas del editor (la cuenta del arrastre, los gestos del puntero, zoom, teclado, centrar), de la validación (tipo, peso, dimensiones, reducción, aviso de foto vertical), de las acciones de la foto, del flyer (foto del podio, del equipo o escudo) y del estudio con la API simulada.

## Bucket

- No hay que cambiar nada. El backend sube con la llave `service_role`, que no pasa por las políticas de Storage, al bucket público de siempre (`SUPABASE_STORAGE_BUCKET`), en la carpeta `podios/`.
- No conviene ponerle al bucket tipos permitidos ni peso máximo: es uno solo para todo (escudos, fotos, cédulas y actas en PDF, calendarios en Excel y logos de auspiciantes de hasta 10 MB) y esas subidas se romperían. La validación vive en el backend.
- Revisión opcional en Studio (Storage → Policies): que el bucket no tenga políticas de INSERT, UPDATE o DELETE para `anon` ni `authenticated`; el sitio nunca sube directo desde el navegador.
- Nginx ya acepta los 4 MB de las fotos de jugadores; la foto del podio llega más liviana porque el navegador la reduce.

## Comprobación

- `pytest` en Python 3.12 y 3.13 (758 pruebas, con el contrato de los casos nuevos y la migración probada en PostgreSQL), `npm test` (29 archivos, 181 pruebas, con tipos y fronteras), build y prueba de humo.
- Capturas del estudio, en un navegador real con los datos del torneo 5, del editor abierto, de la subida (foto que cabe, de 5,5 MB reducida en el navegador, vertical y de menos de 1080 × 608 px), de quitar la foto y de los tres flyers con y sin foto, en estados y redes.
