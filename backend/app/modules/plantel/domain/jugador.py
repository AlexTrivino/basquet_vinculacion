"""Jugador: la entidad, su edad y quién ve o gestiona sus datos personales."""
from dataclasses import dataclass, field
from datetime import date, datetime

from app.shared.domain.errores import Conflicto

# Datos que solo ven el super_admin y el delegado de un equipo del jugador
CAMPOS_PRIVADOS = (
    'documento_identificacion', 'fecha_nacimiento', 'correo', 'telefono',
    'url_cedula', 'url_acta_bachiller', 'delegados_autorizados',
)
EN_MAYUSCULAS = ('nombre', 'documento_identificacion', 'telefono')


class CedulaRepetida(Conflicto):
    """La cédula ya es de otro jugador; ``jugador`` es ese jugador, si se sabe."""

    def __init__(self, mensaje, jugador=None):
        super().__init__(mensaje)
        self.jugador = jugador


@dataclass
class PlantillaDeJugador:
    id_plantilla: int
    numero_camiseta: int | None
    id_equipo: int
    nombre_equipo: str | None
    id_torneo: int
    nombre_torneo: str | None
    estado: str = 'activo'


@dataclass
class Jugador:
    id_jugador: int
    nombre: str
    documento_identificacion: str
    fecha_nacimiento: date
    genero: str | None = None
    url_foto: str | None = None
    url_cedula: str | None = None
    url_acta_bachiller: str | None = None
    correo: str | None = None
    telefono: str | None = None
    estado: str = 'activo'
    created_at: datetime | None = None
    updated_at: datetime | None = None
    plantillas: list[PlantillaDeJugador] = field(default_factory=list)  # todas; solo en la ficha de administración


def puede_ver_privados(rol, id_usuario, delegados):
    """El super_admin siempre; un delegado, si dirige un equipo donde el jugador tiene plantilla activa.

    ``delegados``: el id del delegado de cada uno de esos equipos.
    """
    if rol == 'super_admin':
        return True
    return rol == 'delegado' and str(id_usuario) in {str(d) for d in delegados if d}


def delegado_puede_gestionar(id_usuario, delegados):
    """Un delegado gestiona a un jugador libre (sin plantilla activa) o que juega en uno de sus equipos."""
    return not delegados or id_usuario in delegados


def sin_privados(perfil):
    return {k: v for k, v in perfil.items() if k not in CAMPOS_PRIVADOS}


def edad(nacimiento, hoy):
    if not nacimiento:
        return None
    return hoy.year - nacimiento.year - ((hoy.month, hoy.day) < (nacimiento.month, nacimiento.day))


def hace_anios(hoy, anios):
    """La misma fecha de hoy, ``anios`` atrás (el 29 de febrero cae al 28)."""
    try:
        return hoy.replace(year=hoy.year - anios)
    except ValueError:
        return hoy.replace(year=hoy.year - anios, day=28)
