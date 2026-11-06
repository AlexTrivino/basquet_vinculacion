"""Usuario del sistema. Identidad no tiene reglas propias: el dominio es solo la entidad; iniciar sesión es cosa de
Supabase Auth y los permisos por rol los revisa token_required (app/shared/http/autenticacion.py)."""
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Usuario:
    id_usuario: str
    nombre: str
    correo: str
    rol: str  # super_admin, delegado o visor
    estado: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
