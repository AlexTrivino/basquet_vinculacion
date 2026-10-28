"""Plantilla: un jugador en la nómina de un equipo para un torneo. Quién entra y quién ve sus datos personales."""
from dataclasses import dataclass
from datetime import date, datetime

from app.shared.domain.errores import ReglaDeNegocio
from app.shared.domain.reglas import MAX_JUGADORES_PLANTILLA

VIGENTES = ('borrador', 'pendiente', 'aprobado')  # inscripciones a cuya plantilla se pueden agregar jugadores


@dataclass
class JugadorDePlantilla:
    id_jugador: int
    nombre: str
    genero: str | None = None
    documento_identificacion: str | None = None
    fecha_nacimiento: date | None = None
    telefono: str | None = None
    correo: str | None = None
    url_foto: str | None = None
    url_cedula: str | None = None
    url_acta_bachiller: str | None = None
    estado: str = 'activo'


@dataclass
class Plantilla:
    id_plantilla: int
    id_jugador: int
    id_torneo: int
    id_equipo: int
    id_categoria: int | None
    numero_camiseta: int | None = None
    estado: str = 'activo'
    created_at: datetime | None = None
    updated_at: datetime | None = None
    dueno: str | None = None  # el delegado del equipo
    jugador: JugadorDePlantilla | None = None


@dataclass
class CategoriaInscrita:
    id_categoria: int
    nombre_categoria: str
    edad_minima: int
    edad_maxima: int | None = None


def edad_deportiva(nacimiento, hoy):
    """La edad del reglamento: el año en curso menos el de nacimiento, sin mirar día ni mes."""
    return hoy.year - nacimiento.year


def validar_edad(edad, categoria):
    if edad < categoria.edad_minima:
        raise ReglaDeNegocio(f'El jugador tiene {edad} años y no cumple la edad mínima de {categoria.edad_minima} años '
                             f'para la categoría "{categoria.nombre_categoria}".')
    if categoria.edad_maxima is not None and edad > categoria.edad_maxima:
        raise ReglaDeNegocio(f'El jugador tiene {edad} años y supera la edad máxima de {categoria.edad_maxima} años '
                             f'para la categoría "{categoria.nombre_categoria}".')


def validar_cupo_de_plantilla(jugadores):
    """Una plantilla tiene a lo sumo MAX_JUGADORES_PLANTILLA jugadores activos."""
    if jugadores >= MAX_JUGADORES_PLANTILLA:
        raise ReglaDeNegocio(f'El equipo ya ha alcanzado el límite máximo permitido de {MAX_JUGADORES_PLANTILLA} jugadores en la plantilla.')


def ve_datos_personales(entrada, id_usuario, rol):
    """La nómina es pública; los datos personales del jugador, solo para el super_admin y el delegado del equipo."""
    if rol == 'super_admin':
        return True
    return rol == 'delegado' and entrada.dueno is not None and str(entrada.dueno) == str(id_usuario)
