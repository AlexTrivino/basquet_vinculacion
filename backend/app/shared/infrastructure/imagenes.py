"""Imágenes con Pillow: medirlas sin decodificarlas y dejar una foto lista para el bucket.

El archivo ya pasó por ``almacenamiento.validar_archivo`` (tipo real y peso). Aquí se mira lo que trae adentro, y un
archivo que traiga cualquier otra cosa (un encabezado válido y el resto dañado, una bomba de descompresión) sale como
``ValueError`` con un mensaje para el usuario: ninguna excepción de Pillow llega a la respuesta.
"""
from io import BytesIO

from PIL import Image, ImageOps

LADO_MAXIMO = 2560   # px del lado mayor: sobra para el flyer de 1080 px y la foto pesa unos cientos de KB
CALIDAD_WEBP = 85
ORIENTACION = 0x0112  # etiqueta EXIF; los valores 5 a 8 giran la foto 90°
_NO_SE_LEE = 'No se pudo leer la foto: el archivo está dañado o no es una imagen.'


def medir(stream):
    """(ancho, alto) en px como se verá la foto, con su giro EXIF. Lee solo la cabecera: no decodifica los píxeles,
    así una bomba de descompresión se mide sin gastar memoria. ``ValueError`` si no se puede leer."""
    try:
        with Image.open(stream) as imagen:
            ancho, alto = imagen.size
            if imagen.getexif().get(ORIENTACION) in (5, 6, 7, 8):
                ancho, alto = alto, ancho
    except Exception:  # Pillow lanza OSError, SyntaxError, ValueError, DecompressionBombError... según el daño
        raise ValueError(_NO_SE_LEE) from None
    stream.seek(0)
    return ancho, alto


def normalizar(stream):
    """La foto lista para el bucket: derecha según su EXIF, de 2560 px de lado mayor como máximo y en WebP al 85 %.
    Pillow no copia los metadatos al guardar, así que el GPS y la cámara quedan fuera. Devuelve (bytes, ancho, alto)."""
    try:
        with Image.open(stream) as original:
            imagen = ImageOps.exif_transpose(original)
            modo = 'RGBA' if imagen.has_transparency_data else 'RGB'
            if imagen.mode != modo:
                imagen = imagen.convert(modo)
            imagen.load()
    except Exception:  # igual que en medir: el contenido es de quien lo subió
        raise ValueError(_NO_SE_LEE) from None
    imagen.thumbnail((LADO_MAXIMO, LADO_MAXIMO), Image.Resampling.LANCZOS)
    salida = BytesIO()
    imagen.save(salida, 'WEBP', quality=CALIDAD_WEBP)
    return salida.getvalue(), *imagen.size
