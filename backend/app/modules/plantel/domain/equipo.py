"""Equipo: la entidad, quién lo gestiona y cuántos equipos activos administra un delegado."""
from dataclasses import dataclass, field
from datetime import datetime

from app.shared.domain.errores import Conflicto
from app.shared.domain.reglas import MAX_EQUIPOS_POR_DELEGADO


@dataclass
class UsuarioResumen:
    id_usuario: str
    nombre: str
    correo: str


@dataclass
class TorneoResumen:
    id_torneo: int
    nombre: str


@dataclass
class CategoriaResumen:
    id_categoria: int
    nombre_categoria: str


@dataclass
class InscripcionResumen:
    id_inscripcion: int
    estado_inscripcion: str
    torneo: TorneoResumen | None = None
    categoria: CategoriaResumen | None = None


@dataclass
class Equipo:
    id_equipo: int
    nombre_equipo: str
    id_usuario: str  # el delegado dueño
    estado: str = 'activo'
    url_logo: str | None = None
    url_foto_equipo: str | None = None  # el banner
    created_at: datetime | None = None
    updated_at: datetime | None = None
    # Solo en la vista de administración:
    usuario: UsuarioResumen | None = None
    inscripciones: list[InscripcionResumen] = field(default_factory=list)


def puede_gestionar(equipo, id_usuario, rol):
    """El super_admin gestiona cualquier equipo; un delegado, solo los suyos."""
    return rol == 'super_admin' or equipo.id_usuario == id_usuario


def validar_cupo_de_equipos(activos):
    """Un delegado administra a lo sumo MAX_EQUIPOS_POR_DELEGADO equipos activos."""
    if activos >= MAX_EQUIPOS_POR_DELEGADO:
        raise Conflicto(f'Límite alcanzado: Un delegado solo puede administrar {MAX_EQUIPOS_POR_DELEGADO} equipo(s).')
