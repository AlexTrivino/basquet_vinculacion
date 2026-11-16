"""Casos de uso de la foto del ganador en el flyer del podio.

Cada foto es de un equipo en una categoría y la sube el super_admin. Reciben el repositorio (RepositorioPartidos), la
unidad de trabajo y, los que tocan archivos, el almacén (``shared.infrastructure.almacenamiento``) y ``imagenes``
(``shared.infrastructure.imagenes``): quien llama los pasa, porque esta capa no importa infraestructura.
"""
from io import BytesIO

from app.modules.competencia.application import fase_final
from app.modules.competencia.domain import podio
from app.shared.domain.errores import NoEncontrado, ReglaDeNegocio

CARPETA = 'podios'
SIN_FOTO = 'Ese equipo no tiene foto en el podio de esta categoría.'


def _esta_en_el_podio(id_categoria, id_equipo, repositorio):
    """La categoría, si el equipo está hoy en su podio: así, si se corrige la final, no se sube la foto de quien ya no está."""
    categoria = fase_final.buscar_categoria(id_categoria, repositorio)
    torneo = repositorio.torneo(categoria.id_torneo)
    if torneo is None:
        raise NoEncontrado('Torneo no encontrado.')
    if id_equipo not in {p['equipo']['id_equipo'] for p in fase_final.podio_de_categoria(torneo, categoria, repositorio)}:
        raise ReglaDeNegocio('Ese equipo no está en el podio de la categoría: solo el campeón, el vicecampeón y el tercer lugar tienen foto.')
    return categoria


def subir_foto(id_categoria, id_equipo, stream, validar, *, repositorio, almacen, imagenes, unidad):
    """Guarda la foto del equipo en el podio de la categoría, o reemplaza la que tenía (el encuadre vuelve a 50 / 50 / 1 y
    el archivo anterior se borra del bucket), y la devuelve. ``validar(stream)`` lanza ValueError si el tipo real o el
    peso no sirven; ``imagenes`` lanza ValueError si no se puede leer, y las medidas ReglaDeNegocio."""
    categoria = _esta_en_el_podio(id_categoria, id_equipo, repositorio)
    validar(stream)
    podio.validar_dimensiones(*imagenes.medir(stream))
    datos, ancho, alto = imagenes.normalizar(stream)  # la foto que se guarda: derecha, sin EXIF y de 2560 px como máximo
    url = almacen.subir_archivo(BytesIO(datos), f'equipo-{id_equipo}.webp', f'{CARPETA}/{categoria.id_torneo}/{id_categoria}', 'image/webp')
    anterior = repositorio.guardar_foto_podio(id_categoria, id_equipo, url, ancho, alto)
    unidad.confirmar()
    if anterior:
        almacen.borrar_en_segundo_plano(anterior)
    return repositorio.foto_podio(id_categoria, id_equipo)


def ajustar_encuadre(id_categoria, id_equipo, foco_x, foco_y, zoom, *, repositorio, unidad):
    """Cambia el encuadre de la foto (el archivo queda intacto) y devuelve la foto."""
    if repositorio.foto_podio(id_categoria, id_equipo) is None:
        raise NoEncontrado(SIN_FOTO)
    foco_x, foco_y, zoom = podio.validar_encuadre(foco_x, foco_y, zoom)
    repositorio.ajustar_foto_podio(id_categoria, id_equipo, foco_x, foco_y, zoom)
    unidad.confirmar()
    return repositorio.foto_podio(id_categoria, id_equipo)


def quitar_foto(id_categoria, id_equipo, *, repositorio, almacen, unidad):
    """Borra la foto y su archivo; no pide que el equipo siga en el podio, para poder limpiar tras una corrección."""
    url = repositorio.borrar_foto_podio(id_categoria, id_equipo)
    if url is None:
        raise NoEncontrado(SIN_FOTO)
    unidad.confirmar()
    almacen.borrar_en_segundo_plano(url)
