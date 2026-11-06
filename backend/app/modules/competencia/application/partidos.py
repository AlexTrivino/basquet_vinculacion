"""Casos de uso de partidos. Cada uno recibe sus piezas por parámetro:

- repositorio: RepositorioPartidos (listar, obtener, agregar, actualizar, grupos_de_categoria, inactivos, plantilla,
  estadisticas y sancionados). Al agregar, lanza Conflicto si la base rechaza el partido.
- almacen: subir_archivo(stream, nombre, carpeta, mime) -> url y borrar_archivo(url).
- unidad: confirmar() y revertir().
"""
from app.modules.competencia.domain.partido import (
    box_score as armar_box_score, validar_cambio_de_equipos, validar_cruce, validar_sin_empate,
)
from app.shared.domain.errores import Conflicto, NoEncontrado, ReglaDeNegocio

CARPETA_ACTAS = 'actas_fiba'


def listar(pagina, por_pagina, repositorio, **filtros):
    """(partidos de la página, metadatos de paginación); los filtros son los de la ruta."""
    return repositorio.listar(pagina, por_pagina, **filtros)


def obtener(id_partido, repositorio):
    partido = repositorio.obtener(id_partido)
    if partido is None:
        raise NoEncontrado('Partido no encontrado.')
    return partido


def crear(datos, *, repositorio, unidad):
    """Programa un partido si el cruce es válido. ``datos``: los campos del partido, ya validados."""
    validar_cruce(datos['id_equipo_local'], datos['id_equipo_visitante'],
                  repositorio.grupos_de_categoria(datos['id_torneo'], datos['id_categoria']), datos.get('llave'),
                  repositorio.inactivos())
    try:
        id_partido = repositorio.agregar(datos)
        unidad.confirmar()
    except Conflicto:
        unidad.revertir()
        raise ReglaDeNegocio('No se pudo crear el partido por un conflicto de datos.') from None
    return obtener(id_partido, repositorio)


def actualizar(id_partido, cambios, *, repositorio, unidad):
    """Cambia logística, equipos, estado o marcador. ``cambios``: los campos que llegan, ya validados."""
    partido = obtener(id_partido, repositorio)
    validar_cambio_de_equipos(partido, cambios)
    local = cambios.get('id_equipo_local', partido.id_equipo_local)
    visitante = cambios.get('id_equipo_visitante', partido.id_equipo_visitante)
    if (local, visitante) != (partido.id_equipo_local, partido.id_equipo_visitante):
        validar_cruce(local, visitante, repositorio.grupos_de_categoria(partido.id_torneo, partido.id_categoria), partido.llave,
                      repositorio.inactivos())
    validar_sin_empate(partido, cambios)
    repositorio.actualizar(id_partido, cambios)
    unidad.confirmar()
    return obtener(id_partido, repositorio)


def anular(id_partido, *, repositorio, unidad):
    """Anulación lógica: el partido queda 'anulado' y sale de las tablas y del calendario."""
    _cambiar_estado(id_partido, 'anulado', repositorio, unidad)


def restaurar(id_partido, *, repositorio, unidad):
    """Restaura un partido anulado pasándolo a 'programado'."""
    _cambiar_estado(id_partido, 'programado', repositorio, unidad)


def _cambiar_estado(id_partido, estado, repositorio, unidad):
    if repositorio.obtener(id_partido) is None:
        raise NoEncontrado('El partido no existe.')
    repositorio.actualizar(id_partido, {'estado': estado})
    unidad.confirmar()


def box_score(id_partido, repositorio):
    """Números del partido por lado, con todos los jugadores activos de cada plantilla aunque no tengan estadísticas."""
    partido = obtener(id_partido, repositorio)
    estadisticas = repositorio.estadisticas(id_partido)
    sancionados = repositorio.sancionados(id_partido)
    return {
        lado: armar_box_score(repositorio.plantilla(partido.id_torneo, id_equipo), estadisticas, sancionados)
        for lado, id_equipo in (('local', partido.id_equipo_local), ('visitante', partido.id_equipo_visitante))
    }


def subir_acta(id_partido, stream, nombre, validar, *, repositorio, almacen, unidad):
    """Reemplaza el acta del partido y devuelve su URL. ``validar(stream) -> mime`` lanza ValueError si no sirve.

    Como hoy, el acta anterior se borra antes de validar la nueva (specs/03-competencia, fuera de alcance).
    """
    partido = obtener(id_partido, repositorio)
    if partido.url_planilla_fiba:
        try:
            almacen.borrar_archivo(partido.url_planilla_fiba)
        except Exception:
            pass  # se sigue aunque no se pueda borrar
    mime = validar(stream)
    url = almacen.subir_archivo(stream, nombre, f'{CARPETA_ACTAS}/{id_partido}', mime)
    repositorio.actualizar(id_partido, {'url_planilla_fiba': url})
    unidad.confirmar()
    return url


def eliminar_acta(id_partido, *, repositorio, almacen, unidad):
    partido = obtener(id_partido, repositorio)
    if not partido.url_planilla_fiba:
        raise ReglaDeNegocio('El partido no tiene un acta subida.')
    almacen.borrar_archivo(partido.url_planilla_fiba)
    repositorio.actualizar(id_partido, {'url_planilla_fiba': None})
    unidad.confirmar()
