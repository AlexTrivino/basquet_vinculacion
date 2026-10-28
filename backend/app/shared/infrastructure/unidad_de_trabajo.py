"""Unidad de trabajo sobre la sesión de SQLAlchemy de la petición: los casos de uso confirman o revierten con ella."""
from app.shared.infrastructure.db import db


class UnidadDeTrabajo:
    def confirmar(self):
        db.session.commit()

    def revertir(self):
        db.session.rollback()
