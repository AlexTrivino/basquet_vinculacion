"""Sanción disciplinaria de un jugador en un partido. No tiene reglas propias: el dominio es solo la entidad."""
from dataclasses import dataclass
from datetime import date, datetime


@dataclass
class JugadorEnSancion:
    id_jugador: int
    nombre: str


@dataclass
class PartidoEnSancion:
    id_partido: int
    fecha: date
    estado: str


@dataclass
class Sancion:
    id_sancion: int
    motivo: str
    fecha: date
    estado: str
    id_jugador: int
    id_partido: int
    created_at: datetime | None = None
    jugador: JugadorEnSancion | None = None
    partido: PartidoEnSancion | None = None
