"""Inscripción: un equipo en un torneo y una categoría. Cuándo se acepta, el borrador único, el envío a revisión y el retiro."""
from dataclasses import dataclass
from datetime import date, datetime

from app.shared.domain.errores import Conflicto, ReglaDeNegocio
from app.shared.domain.reglas import MAX_EQUIPOS_POR_DELEGADO, MAX_JUGADORES_PLANTILLA, MIN_JUGADORES_PLANTILLA

ESTADOS = ('pendiente', 'aprobado', 'rechazado', 'borrador')  # 'retirado' sale solo del retiro
RECHAZADO = 'rechazado'
UN_BORRADOR = ('Solo se permite tener una solicitud en borrador a la vez. '
               'Debes completar o eliminar tu solicitud actual antes de iniciar otra.')


class SinCupoParaClubNuevo(Conflicto):
    """El delegado no puede abrir otro club: ya tiene su cupo de equipos o un borrador sin terminar."""


@dataclass
class TorneoResumen:
    id_torneo: int
    nombre: str
    estado: str
    fecha_inicio: date | None = None
    fecha_fin: date | None = None


@dataclass
class UsuarioResumen:
    nombre: str
    correo: str


@dataclass
class EquipoResumen:
    id_equipo: int
    nombre_equipo: str
    id_usuario: str  # el delegado dueño
    estado: str = 'activo'
    url_logo: str | None = None
    usuario: UsuarioResumen | None = None


@dataclass
class CategoriaResumen:
    id_categoria: int
    nombre_categoria: str
    genero_categoria: str
    edad_minima: int
    edad_maxima: int | None = None


@dataclass
class Inscripcion:
    id_inscripcion: int
    id_torneo: int
    id_equipo: int
    id_categoria: int
    estado_inscripcion: str
    fecha_inscripcion: datetime | None = None
    grupo: str | None = None
    url_comprobante_pago: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    torneo: TorneoResumen | None = None
    equipo: EquipoResumen | None = None
    categoria: CategoriaResumen | None = None


def validar_torneo_para_inscribir(estado):
    """Solo un torneo programado acepta inscripciones. ``estado``: el del torneo, None si no existe."""
    if estado in (None, 'inactivo'):
        raise ReglaDeNegocio('El torneo especificado no existe o está inactivo.')
    if estado != 'programado':
        raise ReglaDeNegocio('No se pueden registrar inscripciones en un torneo en curso, finalizado o anulado.')


def validar_equipo_para_inscribir(equipo):
    if equipo is None or equipo.estado == 'inactivo':
        raise ReglaDeNegocio('El equipo especificado no existe o está inactivo.')


def validar_un_borrador(borradores):
    """Un delegado tiene a lo sumo una inscripción en borrador."""
    if borradores >= 1:
        raise ReglaDeNegocio(UN_BORRADOR)


def validar_club_nuevo(equipos_activos, borradores):
    """Para abrir un club, el delegado tiene lugar en su cupo de equipos y ningún borrador abierto."""
    if equipos_activos >= MAX_EQUIPOS_POR_DELEGADO:
        raise SinCupoParaClubNuevo(f'No puedes administrar más de {MAX_EQUIPOS_POR_DELEGADO} equipo(s) simultáneamente. Límite alcanzado.')
    if borradores >= 1:
        raise SinCupoParaClubNuevo(UN_BORRADOR)


def validar_envio(estado, url_comprobante, dorsales):
    """Una inscripción en borrador o pendiente va a revisión con su comprobante y una plantilla de
    MIN_JUGADORES_PLANTILLA a MAX_JUGADORES_PLANTILLA jugadores de dorsales distintos.

    ``dorsales``: el de cada jugador activo de la plantilla (None si no tiene).
    """
    if estado not in ('borrador', 'pendiente'):
        raise Conflicto(f'La inscripción ya se encuentra en estado "{estado}".')
    if not url_comprobante:
        raise ReglaDeNegocio('La inscripción debe contar con el comprobante de pago adjunto antes de ser enviada.')
    total = len(dorsales)
    if total < MIN_JUGADORES_PLANTILLA:
        raise ReglaDeNegocio(f'El equipo cuenta con {total} jugador(es). Se requiere un mínimo de {MIN_JUGADORES_PLANTILLA} '
                             'jugadores para enviar la inscripción.')
    if total > MAX_JUGADORES_PLANTILLA:
        raise ReglaDeNegocio(f'El equipo cuenta con {total} jugadores. Se permite un máximo de {MAX_JUGADORES_PLANTILLA} jugadores.')
    numeros = [d for d in dorsales if d is not None]
    if len(numeros) != len(set(numeros)):
        raise ReglaDeNegocio('Existen números de camiseta duplicados en la nómina. Cada jugador debe tener un dorsal único.')


def validar_retiro(estado):
    if estado != 'aprobado':
        raise ReglaDeNegocio('Solo se pueden retirar equipos que están inscritos y aprobados.')
