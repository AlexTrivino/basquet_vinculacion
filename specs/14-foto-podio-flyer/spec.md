# Fase 14 · La foto del ganador en el flyer del podio

## Problema

El flyer del podio quedó aprobado (ruta 1, en la paleta de la web y con el logo de la Copa: 16-11). Su héroe es la foto del equipo, pero hoy ningún equipo del podio tiene una en el sistema: la del campeón del torneo 5 se recortó del flyer del organizador. El admin necesita subir la foto del ganador (y, si quiere, la del 2.º y el 3.º), encuadrarla para el flyer y que el Estudio de flyers la use sola.

## Qué entrega

- **Una foto por equipo en cada categoría** (`fotos_podio`; la categoría es de un solo torneo), con su URL en el bucket, el ancho y el alto guardados y el encuadre: el foco en X y en Y (0 a 100 %) y el zoom (1 a 3). La foto sigue al equipo y no al puesto: si se corrige la final y cambia el campeón, la foto no queda en el lugar equivocado.
- **Subida, solo el super_admin, con validación en dos capas:**
  - En el navegador, para avisar al momento: JPG, PNG o WebP; el original hasta 15 MB y de al menos 1080 × 608 px. Si ya cabe (hasta 4 MB y 2560 px de lado mayor) sube tal cual; si no, la redibuja a 2560 px en JPEG al 88 % (al 70 % si aun así pasa de 4 MB): una foto de celular de 6 MB llega con ~1 MB. Si es vertical, avisa que en el flyer se verá una franja.
  - En el servidor, la regla de verdad: el tipo real por sus primeros bytes (`validar_archivo`: JPG, PNG o WebP, aunque la extensión diga otra cosa), hasta 4 MB (todo el pedido tiene un tope de 5 MB), de 1080 × 608 a 8000 × 8000 px y hasta 40 megapíxeles (freno a las bombas de descompresión). Después la vuelve a codificar: la endereza según su EXIF, le quita los metadatos (el GPS incluido), la deja en 2560 px de lado mayor como máximo y la guarda en WebP al 85 %.
- **Ajuste de recorte:** un editor con el marco del héroe del flyer (1080 × 760 px en estados y 1080 × 610 px en redes, con su mismo desvanecido). Se arrastra la foto para mover el foco, un deslizador da el zoom, las flechas del teclado mueven el foco de a 1 % y «Centrar» vuelve a 50 / 50 / 1. El flyer de arriba se actualiza en vivo. Se guarda solo el encuadre: el archivo queda intacto y el mismo encuadre sirve para los dos formatos.
- **Estudio de flyers:** un tipo nuevo, «Podio del torneo» (torneo y categoría), con los tres flyers de la ruta 1 en estados y en redes, para descargar como los demás. Cada puesto tiene «Subir foto», «Ajustar recorte» y «Quitar foto». Sin foto del podio, el flyer usa la foto del equipo (`url_foto_equipo`) y, sin ninguna, el escudo bajo el cono de luz.

## Fuera de alcance

- Editar la foto (filtros, recortar el archivo, quitar el fondo) y las galerías.
- Fotos de equipos que no están en el podio.
- La foto en la sección Podio de la portada (se puede sumar después: la ruta pública ya la devolvería).

## Criterios de aceptación

- [x] La migración crea `fotos_podio` solo si no existe (la tabla puede haberse creado a mano con la query de producción) y, en PostgreSQL, le habilita RLS.
- [x] Cada rechazo tiene su mensaje y su prueba: tipo (un texto renombrado a .jpg), peso (más de 4 MB), dimensiones (menos de 1080 × 608 o más de 8000 × 8000), un equipo que no está en el podio, un encuadre fuera de rango y un delegado que intenta subir.
- [x] La foto guardada no trae EXIF y mide como máximo 2560 px; reemplazar o quitar una foto borra el archivo anterior del bucket.
- [x] El flyer usa la foto con su encuadre en los dos formatos y, sin ella, la del equipo o el escudo.
- [x] Casos de contrato de las rutas nuevas; `pytest`, `npm test`, build y prueba de humo en verde.
