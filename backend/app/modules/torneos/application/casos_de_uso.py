"""Casos de uso de torneos y categorías. Cada uno recibe sus piezas por parámetro:

- repositorio: RepositorioTorneos; su ``obtener`` devuelve el torneo en cualquier estado.
- almacen: subir_archivo(stream, nombre, carpeta, mime) -> url.
- unidad: confirmar() y revertir().
"""
from app.modules.torneos.domain.torneo import GENEROS, validar_fechas, vigente  # vigente también la usan otros módulos
from app.shared.domain.errores import Conflicto, NoEncontrado

ABIERTO_A_INSCRIPCION = 'programado'


def listar(anio, pagina, por_pagina, repositorio):
    """(torneos vigentes de la página, metadatos), del más reciente al más antiguo; ``anio`` filtra por el inicio."""
    return repositorio.listar_vigentes(anio, pagina, por_pagina)


def listar_todos(pagina, por_pagina, repositorio):
    """Para la administración: también los inactivos y los anulados."""
    return repositorio.listar_todos(pagina, por_pagina)


def abiertos_a_inscripcion(repositorio):
    """Los torneos programados, los únicos que aceptan inscripciones."""
    return repositorio.listar_por_estado(ABIERTO_A_INSCRIPCION)


def obtener(id_torneo, repositorio):
    """Un torneo vigente; los inactivos y los anulados no se encuentran."""
    torneo = repositorio.obtener(id_torneo)
    if torneo is None or not vigente(torneo.estado):
        raise NoEncontrado('Torneo no encontrado.')
    return torneo


def crear(datos, *, repositorio, unidad):
    """Crea el torneo con sus categorías. ``datos``: los campos ya validados y la lista ``categorias``."""
    datos = dict(datos)
    categorias = datos.pop('categorias', [])
    id_torneo = repositorio.agregar(datos, categorias)
    unidad.confirmar()
    return repositorio.obtener(id_torneo)


def actualizar(id_torneo, cambios, *, repositorio, unidad):
    """Cambia los datos de un torneo vigente; las fechas se revisan contra las que ya tiene."""
    torneo = obtener(id_torneo, repositorio)
    validar_fechas(cambios.get('fecha_inicio', torneo.fecha_inicio), cambios.get('fecha_fin', torneo.fecha_fin))
    repositorio.actualizar(id_torneo, cambios)
    unidad.confirmar()
    return repositorio.obtener(id_torneo)  # si el cambio lo anuló, se devuelve igual


def dar_de_baja(id_torneo, *, repositorio, unidad):
    """Baja lógica: el torneo pasa a 'inactivo'. Vale también para uno anulado; uno ya inactivo no se encuentra."""
    torneo = repositorio.obtener(id_torneo)
    if torneo is None or torneo.estado == 'inactivo':
        raise NoEncontrado('Torneo no encontrado.')
    repositorio.actualizar(id_torneo, {'estado': 'inactivo'})
    unidad.confirmar()


def anular(id_torneo, *, repositorio, unidad):
    """Un torneo vigente pasa a 'anulado': sale de la parte pública y su historial queda de solo lectura."""
    torneo = repositorio.obtener(id_torneo)
    if torneo is None or not vigente(torneo.estado):
        raise NoEncontrado('Torneo no encontrado o ya inactivo/anulado.')
    repositorio.actualizar(id_torneo, {'estado': 'anulado'})
    unidad.confirmar()


def subir_calendario(id_torneo, stream, nombre, mime, *, repositorio, almacen, unidad):
    """Sube el calendario y lo deja en el torneo; devuelve su URL. Como hoy, el anterior queda en Storage."""
    obtener(id_torneo, repositorio)
    url = almacen.subir_archivo(stream, nombre, f'torneos/{id_torneo}/calendario', mime)
    actualizar(id_torneo, {'url_calendario_excel': url}, repositorio=repositorio, unidad=unidad)
    return url


def listar_categorias(genero, id_torneo, repositorio):
    """Por género y edad mínima. ``genero`` filtra solo si es uno de GENEROS; ``id_torneo``, si llega."""
    return repositorio.listar_categorias(genero if genero in GENEROS else None, id_torneo)


def obtener_categoria(id_categoria, repositorio):
    categoria = repositorio.obtener_categoria(id_categoria)
    if categoria is None:
        raise NoEncontrado('Categoría no encontrada.')
    return categoria


def agregar_categoria(id_torneo, datos, *, repositorio, unidad):
    """Agrega una categoría a un torneo vigente. ``datos``: los campos ya validados."""
    obtener(id_torneo, repositorio)
    id_categoria = repositorio.agregar_categoria({**datos, 'id_torneo': id_torneo})
    unidad.confirmar()
    return repositorio.obtener_categoria(id_categoria)


def eliminar_categoria(id_categoria, *, repositorio, unidad):
    """Borra una categoría que no tenga equipos inscritos."""
    obtener_categoria(id_categoria, repositorio)
    if repositorio.inscripciones_de_categoria(id_categoria):
        raise Conflicto('No se puede eliminar la categoría porque ya tiene equipos inscritos. Retire los equipos primero.')
    repositorio.eliminar_categoria(id_categoria)
    unidad.confirmar()
