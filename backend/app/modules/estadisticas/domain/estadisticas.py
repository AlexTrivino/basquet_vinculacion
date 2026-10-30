"""Estadísticas: qué partidos cuentan, la valoración y la figura, los líderes y la carga de un equipo en un partido."""
from dataclasses import dataclass, field
from datetime import date, time

from app.shared.domain.errores import ReglaDeNegocio, SinPermiso

# Qué partidos cuentan, con el criterio de hoy de cada vista (unificarlo es una decisión abierta del plan;
# el perfil del jugador y el buscador del visor, en plantel, suman todos):
JUGADOS = ('finalizado', 'finalizado_wo')  # los líderes, la planilla y los resultados de los flyers
CON_PUNTOS = ('finalizado',)  # la portada y las figuras: el marcador de un W.O. no son puntos anotados
CARGABLES = ('en_curso', 'finalizado', 'finalizado_wo')  # los partidos a los que se les cargan estadísticas
RUBROS = ('puntos', 'triples', 'rebotes', 'asistencias', 'tapones', 'tiros_libres')  # los de los líderes


@dataclass
class PartidoParaCarga:
    id_torneo: int
    estado: str
    id_equipo_local: int
    id_equipo_visitante: int
    marcador_local: int | None = None
    marcador_visitante: int | None = None


@dataclass
class LineaDePlanilla:
    dorsal: object  # el de la plantilla del torneo; '-' si el jugador no está en ella
    nombre: str
    puntos: int
    triples: int
    faltas: int
    rebotes: int
    asistencias: int


@dataclass
class Planilla:
    """Lo que lleva la planilla oficial de un partido; las líneas de cada equipo, de más a menos puntos."""
    id_partido: int
    estado: str
    torneo: str | None
    fase: str | None
    fecha: date | None
    hora: time | None
    ubicacion: str | None
    local: str | None
    visitante: str | None
    marcador_local: int | None
    marcador_visitante: int | None
    lineas_local: list[LineaDePlanilla] = field(default_factory=list)
    lineas_visitante: list[LineaDePlanilla] = field(default_factory=list)


def valoracion(linea):
    """Lo que se registra por partido: puntos + rebotes + asistencias + tapones (no hay tiros fallados, robos ni pérdidas)."""
    return linea['puntos'] + linea['rebotes'] + linea['asistencias'] + linea['tapones']


def orden_de_figura(figura):
    """La figura es la de mayor valoración; en empate, la de más puntos."""
    return (figura['valoracion'], figura['linea']['puntos'])


def etiqueta_categoria(nombre, genero):
    """'Juvenil (masculino)'; si el nombre ya dice el género ('Cadetes +30 Femenino'), no se repite."""
    genero = (genero or '').strip()
    return nombre if not genero or genero.lower() in nombre.lower() else f'{nombre} ({genero})'


def lideres(totales, limite=10):
    """Los ``limite`` primeros de cada rubro, sin los que tienen 0 en él; en empate, la mayor valoración, como en el
    flyer. ``totales``: uno por jugador, con un valor por rubro."""
    return {rubro: sorted([t for t in totales if t[rubro] > 0], key=lambda t: (t[rubro], valoracion(t)), reverse=True)[:limite]
            for rubro in RUBROS}


def validar_carga(partido, id_equipo, puntos):
    """Las estadísticas de un equipo se cargan en un partido en curso o terminado que jugó, y sus puntos suman su marcador."""
    if partido.estado not in CARGABLES:
        raise ReglaDeNegocio('Solo se pueden registrar estadísticas en partidos en curso o finalizados.')
    if id_equipo not in (partido.id_equipo_local, partido.id_equipo_visitante):
        raise ReglaDeNegocio('El equipo especificado no participó en este partido.')
    marcador = partido.marcador_local if id_equipo == partido.id_equipo_local else partido.marcador_visitante
    if marcador is not None and puntos != marcador:
        raise ReglaDeNegocio(f'La suma de puntos individuales ({puntos}) no coincide con '
                             f'el marcador oficial del equipo en el partido ({marcador}).')


def validar_jugadores_propios(enviados, del_equipo):
    """Cada jugador de la carga está activo en la plantilla del equipo en el torneo: no se le cargan números a un rival."""
    ajenos = enviados - del_equipo
    if ajenos:
        raise SinPermiso(f'Los siguientes jugadores no pertenecen al equipo en este torneo '
                         f'o no están activos en la plantilla: {sorted(ajenos)}. '
                         f'Posible intento de asignación de estadísticas a jugadores rivales.')
