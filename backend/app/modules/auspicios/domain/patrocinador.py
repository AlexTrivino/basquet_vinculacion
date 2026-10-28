"""Patrocinador del sitio. Auspicios no tiene reglas propias: el dominio es solo la entidad."""
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Patrocinador:
    nombre_patrocinador: str
    url_logo_patrocinador: str | None = None
    url_imagen_promocional: str | None = None
    id_patrocinador: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
