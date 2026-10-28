"""Casos de uso de la tabla de posiciones y la fase final.

Reciben repositorio (RepositorioPartidos) y, los que escriben, unidad (confirmar, revertir) por parámetro.
Las categorías son ``llaves.Categoria``.
"""
from app.modules.competencia.application import partidos
from app.modules.competencia.domain import llaves, posiciones
from app.shared.domain.errores import Conflicto, NoEncontrado, ReglaDeNegocio


def nombre_del_torneo(id_torneo, repositorio):
    """Nombre de un torneo vigente (ni inactivo ni anulado)."""
    nombre = repositorio.nombre_del_torneo(id_torneo)
    if nombre is None:
        raise NoEncontrado('Torneo no encontrado.')
    return nombre


def buscar_categoria(id_categoria, repositorio):
    categoria = repositorio.categoria(id_categoria)
    if categoria is None:
        raise NoEncontrado('Categoría no encontrada.')
    return categoria


def categoria_del_torneo(id_torneo, id_categoria, repositorio):
    """La categoría, si es de ese torneo y el torneo está vigente."""
    nombre_del_torneo(id_torneo, repositorio)
    categoria = repositorio.categoria(id_categoria) if id_categoria else None
    if categoria is None or categoria.id_torneo != id_torneo:
        raise NoEncontrado('Categoría no encontrada en este torneo.')
    return categoria


def tabla_de_posiciones(id_torneo, id_categoria, repositorio):
    """Tabla de la fase de grupos. Con categoría: una por grupo, con los inscritos aunque no hayan jugado.
    Sin categoría: una sola con los partidos de todo el torneo."""
    partidos_grupos = repositorio.partidos_fase_grupos(id_torneo, id_categoria)
    grupos = repositorio.grupos_de_categoria(id_torneo, id_categoria) if id_categoria is not None else {}
    if not partidos_grupos and not grupos:
        return []
    tablas = posiciones.tablas_por_grupo(partidos_grupos, grupos)
    equipos = repositorio.equipos([f['id_equipo'] for tabla in tablas.values() for f in tabla])
    return posiciones.filas_con_equipo(tablas, equipos)


def estado(categoria, repositorio):
    """Cuadro de llaves de la categoría y el avance de su fase de grupos."""
    grupos = repositorio.grupos_de_categoria(categoria.id_torneo, categoria.id_categoria)
    con_formato = categoria.formato in llaves.FORMATOS
    return llaves.estado_fase_final(
        categoria, grupos,
        repositorio.partidos_fase_grupos(categoria.id_torneo, categoria.id_categoria),
        repositorio.pendientes_fase_grupos(categoria.id_torneo, categoria.id_categoria),
        repositorio.partidos_de_llaves(categoria.id_torneo, categoria.id_categoria) if con_formato else {},
        repositorio.equipos(list(grupos)) if con_formato and grupos else {},
    )


def recorrido(categoria, repositorio):
    """Posición de cada equipo después de cada fecha de la fase de grupos y su situación."""
    grupos = repositorio.grupos_de_categoria(categoria.id_torneo, categoria.id_categoria)
    return llaves.recorrido(
        categoria, grupos,
        repositorio.partidos_fase_grupos_por_fecha(categoria.id_torneo, categoria.id_categoria),
        repositorio.equipos(list(grupos)) if grupos else {},
    )


def asignar_grupos(categoria, grupos, *, repositorio, unidad):
    """Guarda el grupo (letra o None) de cada inscripción aprobada; ``grupos`` = {id_equipo: 'A'}."""
    if not isinstance(grupos, dict):
        raise ReglaDeNegocio('Falta el objeto "grupos" (id_equipo → letra).')
    aprobados = repositorio.grupos_de_categoria(categoria.id_torneo, categoria.id_categoria)
    asignados = llaves.asignar_grupos(categoria, aprobados, grupos)
    repositorio.guardar_grupos(categoria.id_torneo, categoria.id_categoria, asignados)
    unidad.confirmar()
    return asignados


def generar_llaves(categoria, programacion, *, repositorio, unidad):
    """Crea los partidos de las llaves que ya tienen sus dos equipos; cada uno se confirma al crearlo, como hoy.

    ``programacion``: lista de dicts con ``llave``, ``fecha`` (date), ``hora`` (time) y, opcional, ``ubicacion``.
    Lanza Conflicto si una llave no está lista.
    """
    listas = {l['codigo']: l for l in estado(categoria, repositorio)['llaves'] if l['estado'] == 'listo'}
    creados = []
    for item in programacion:
        llave = listas.get(item['llave'])
        if not llave:
            raise Conflicto(f"La llave {item['llave']} todavía no tiene definidos sus dos equipos o ya existe.")
        datos = {
            'id_torneo': categoria.id_torneo,
            'id_categoria': categoria.id_categoria,
            'id_equipo_local': llave['local']['id_equipo'],
            'id_equipo_visitante': llave['visitante']['id_equipo'],
            'fecha': item['fecha'],
            'hora': item['hora'],
            'fase': llave['ronda'],
            'llave': llave['codigo'],
        }
        if item.get('ubicacion'):
            datos['ubicacion'] = item['ubicacion']
        creados.append(partidos.crear(datos, repositorio=repositorio, unidad=unidad))
    return creados


def guardar_formato(categoria, formato, *, repositorio, unidad):
    """Formato de la fase final: una clave de ``FORMATOS``, o None para quitarlo."""
    if formato is not None and formato not in llaves.FORMATOS:
        raise ReglaDeNegocio('Formato desconocido.')
    repositorio.guardar_formato(categoria.id_categoria, formato)
    unidad.confirmar()
    return repositorio.categoria(categoria.id_categoria)
