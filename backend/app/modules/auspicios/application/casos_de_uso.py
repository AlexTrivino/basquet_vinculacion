"""Casos de uso de auspicios. Cada uno recibe sus piezas por parámetro:

- repositorio: listar(), obtener(id), agregar(patrocinador) -> id, guardar(patrocinador), eliminar(id).
- almacen: subir_archivo(stream, nombre, carpeta, mime) -> url y borrar_archivo(url).
- unidad: confirmar() y revertir().

`logo` llega ya validado por http como (stream, nombre_original, mime).
"""
from app.modules.auspicios.domain.patrocinador import Patrocinador
from app.shared.domain.errores import NoEncontrado

CARPETA = 'patrocinadores'


class NoSeGuardo(Exception):
    """La base rechazó el cambio; la transacción ya se revirtió."""
    # ponytail: vive aquí mientras solo auspicios lo use; pasa a shared/domain cuando otro módulo lo necesite.


def listar(repositorio):
    return repositorio.listar()


def obtener(id_patrocinador, repositorio):
    patrocinador = repositorio.obtener(id_patrocinador)
    if patrocinador is None:
        raise NoEncontrado('Patrocinador no encontrado.')
    return patrocinador


def crear(datos, logo, *, repositorio, almacen, unidad):
    stream, nombre, mime = logo
    url_logo = almacen.subir_archivo(stream, nombre, CARPETA, mime)
    nuevo = Patrocinador(datos['nombre_patrocinador'], url_logo, datos.get('url_imagen_promocional'))
    try:
        nuevo.id_patrocinador = repositorio.agregar(nuevo)
        unidad.confirmar()
    except Exception as error:
        unidad.revertir()
        almacen.borrar_archivo(url_logo)  # el logo recién subido no queda huérfano
        raise NoSeGuardo from error
    return obtener(nuevo.id_patrocinador, repositorio)


def actualizar(id_patrocinador, datos, logo, *, repositorio, almacen, unidad):
    patrocinador = obtener(id_patrocinador, repositorio)
    patrocinador.nombre_patrocinador = datos['nombre_patrocinador']
    if 'url_imagen_promocional' in datos:
        patrocinador.url_imagen_promocional = datos['url_imagen_promocional']
    if logo:
        stream, nombre, mime = logo
        url_vieja = patrocinador.url_logo_patrocinador
        patrocinador.url_logo_patrocinador = almacen.subir_archivo(stream, nombre, CARPETA, mime)
        if url_vieja:
            almacen.borrar_archivo(url_vieja)  # como hoy: antes de confirmar (specs/02-auspicios, fuera de alcance)
    try:
        repositorio.guardar(patrocinador)
        unidad.confirmar()
    except Exception as error:
        unidad.revertir()
        raise NoSeGuardo from error
    return obtener(id_patrocinador, repositorio)


def eliminar(id_patrocinador, *, repositorio, almacen, unidad):
    url_logo = obtener(id_patrocinador, repositorio).url_logo_patrocinador
    try:
        repositorio.eliminar(id_patrocinador)
        unidad.confirmar()
        if url_logo:
            almacen.borrar_archivo(url_logo)  # solo si la base confirmó
    except Exception as error:
        unidad.revertir()
        raise NoSeGuardo from error
