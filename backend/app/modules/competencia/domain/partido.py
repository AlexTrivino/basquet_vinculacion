"""Partido: la entidad que devuelven los casos de uso, las reglas para programarlo, editarlo y finalizarlo, y su box score."""
from dataclasses import dataclass
from datetime import date, datetime, time

from app.shared.domain.errores import ReglaDeNegocio


@dataclass
class EquipoEnPartido:
    id_equipo: int
    nombre_equipo: str
    url_logo: str | None = None


@dataclass
class TorneoEnPartido:
    id_torneo: int
    nombre: str
    estado: str
    fecha_inicio: date | None = None
    fecha_fin: date | None = None


@dataclass
class CategoriaEnPartido:
    id_categoria: int
    nombre_categoria: str
    genero_categoria: str


@dataclass
class Partido:
    id_partido: int
    id_torneo: int
    id_categoria: int
    id_equipo_local: int
    id_equipo_visitante: int
    fecha: date | None = None
    hora: time | None = None
    estado: str = 'programado'
    marcador_local: int = 0
    marcador_visitante: int = 0
    fase: str = ''
    ubicacion: str = ''
    llave: str | None = None  # código de la llave en la fase final; None = fase de grupos
    url_planilla_fiba: str | None = None
    stats_local_procesadas: bool = False
    stats_visitante_procesadas: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None
    torneo: TorneoEnPartido | None = None
    categoria: CategoriaEnPartido | None = None
    equipo_local: EquipoEnPartido | None = None
    equipo_visitante: EquipoEnPartido | None = None


def validar_cruce(id_local, id_visitante, grupos, llave=None):
    """Equipos distintos, ambos aprobados en la categoría y, en la fase de grupos, del mismo grupo.

    ``grupos``: {id_equipo: grupo} de las inscripciones aprobadas de la categoría. Un partido de fase de grupos
    entre grupos distintos no contaría en ninguna tabla; los cruces de la fase final llevan llave y sí mezclan grupos.
    """
    if id_local == id_visitante:
        raise ReglaDeNegocio('El equipo local y visitante no pueden ser el mismo.')
    if id_local not in grupos:
        raise ReglaDeNegocio('El equipo local no tiene una inscripción aprobada para este torneo en esta categoría.')
    if id_visitante not in grupos:
        raise ReglaDeNegocio('El equipo visitante no tiene una inscripción aprobada para este torneo en esta categoría.')
    if not llave and grupos[id_local] != grupos[id_visitante]:
        raise ReglaDeNegocio(
            'En la fase de grupos solo se enfrentan equipos del mismo grupo '
            f'(local: {grupos[id_local] or "sin grupo"}, visitante: {grupos[id_visitante] or "sin grupo"}).'
        )


def validar_cambio_de_equipos(partido, cambios):
    """Los equipos solo se cambian mientras el partido está programado."""
    if partido.estado != 'programado':
        if 'id_equipo_local' in cambios and cambios['id_equipo_local'] != partido.id_equipo_local:
            raise ReglaDeNegocio('No se puede cambiar el equipo local de un partido que ya no está programado.')
        if 'id_equipo_visitante' in cambios and cambios['id_equipo_visitante'] != partido.id_equipo_visitante:
            raise ReglaDeNegocio('No se puede cambiar el equipo visitante de un partido que ya no está programado.')


def validar_sin_empate(partido, cambios):
    """En básquet no hay empates: un finalizado empatado contaría como victoria del local y en las llaves haría
    avanzar al local. Solo se revisa si los cambios tocan el estado o el marcador."""
    if {'estado', 'marcador_local', 'marcador_visitante'} & cambios.keys() \
            and cambios.get('estado', partido.estado) == 'finalizado' \
            and cambios.get('marcador_local', partido.marcador_local) == cambios.get('marcador_visitante', partido.marcador_visitante):
        raise ReglaDeNegocio('En básquet no hay empates: revisa el marcador antes de finalizar el partido.')


ESTADISTICAS = ('puntos_anotados', 'triples_anotados', 'faltas_cometidas', 'rebotes', 'asistencias', 'tapones',
                'tiros_libres_anotados')


def box_score(plantilla, estadisticas, sancionados):
    """Una fila por jugador de la plantilla, de más a menos puntos; quien no tiene estadísticas va en cero.

    ``plantilla``: (id_jugador, nombre, dorsal) de cada jugador activo. ``estadisticas``: {id_jugador: {campo: valor}}.
    ``sancionados``: ids de los jugadores con una sanción activa en el partido.
    """
    filas = []
    for id_jugador, nombre, dorsal in plantilla:
        stat = estadisticas.get(id_jugador)
        filas.append({
            'id_jugador': id_jugador,
            'nombre_jugador': nombre,
            'dorsal': dorsal,
            **{campo: stat[campo] if stat else 0 for campo in ESTADISTICAS},
            'sancion_activa': id_jugador in sancionados,
        })
    filas.sort(key=lambda x: x['puntos_anotados'], reverse=True)
    return filas
