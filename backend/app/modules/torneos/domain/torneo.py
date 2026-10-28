"""Torneo y sus categorías: las entidades y las reglas de sus estados y fechas, en Python puro."""
from dataclasses import dataclass, field
from datetime import date, datetime

from app.shared.domain.errores import ReglaDeNegocio

OCULTOS = ('inactivo', 'anulado')  # dado de baja o anulado: fuera de la parte pública y ya no se edita
GENEROS = ('masculino', 'femenino')


@dataclass
class Categoria:
    id_categoria: int
    nombre_categoria: str
    genero_categoria: str
    edad_minima: int = 0
    edad_maxima: int | None = None
    formato: str | None = None  # formato de la fase final (competencia); None = sin fase final
    id_torneo: int | None = None


@dataclass
class Torneo:
    id_torneo: int
    nombre: str
    fecha_inicio: date
    fecha_fin: date
    estado: str = 'programado'
    url_calendario_excel: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    categorias: list[Categoria] = field(default_factory=list)


def vigente(estado):
    """Programado, en curso o finalizado: el torneo se ve en la parte pública y se puede editar."""
    return estado not in OCULTOS


def validar_fechas(fecha_inicio, fecha_fin):
    if fecha_fin < fecha_inicio:
        raise ReglaDeNegocio('La fecha de fin debe ser igual o posterior a la fecha de inicio.')
