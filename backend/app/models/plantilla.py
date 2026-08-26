"""Modelo de Plantilla — asignación de jugadores a equipos dentro de un torneo."""
from app import db


class Plantilla(db.Model):
    """Representa la inclusión de un jugador en la plantilla de un equipo para un torneo."""

    __tablename__ = 'plantillas'

    id_plantilla = db.Column(db.Integer, primary_key=True, autoincrement=True)
    numero_camiseta = db.Column(db.Integer, nullable=True)
    id_jugador = db.Column(
        db.Integer, db.ForeignKey('jugadores.id_jugador'), nullable=False
    )
    id_torneo = db.Column(
        db.Integer, db.ForeignKey('torneos.id_torneo'), nullable=False
    )
    id_equipo = db.Column(
        db.Integer, db.ForeignKey('equipos.id_equipo'), nullable=False
    )
    id_categoria = db.Column(
        db.Integer, db.ForeignKey('categorias.id_categoria'), nullable=True
    )
    estado = db.Column(db.String(20), nullable=False, default='activo')

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    jugador = db.relationship('Jugador', back_populates='plantillas', lazy='select')
    torneo = db.relationship('Torneo', back_populates='plantillas', lazy='select')
    equipo = db.relationship('Equipo', back_populates='plantillas', lazy='select')

    # ── Restricciones ──────────────────────────────────────────────
    __table_args__ = (
        db.CheckConstraint("estado IN ('activo', 'inactivo')", name='ck_plantillas_estado'),
    )

    @classmethod
    def activos(cls):
        """Retorna query filtrada excluyendo registros inactivos (soft delete)."""
        return cls.query.filter_by(estado='activo')

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_plantilla': self.id_plantilla,
            'numero_camiseta': self.numero_camiseta,
            'id_jugador': self.id_jugador,
            'id_torneo': self.id_torneo,
            'id_equipo': self.id_equipo,
            'id_categoria': self.id_categoria,
            'estado': self.estado,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<Plantilla jugador={self.id_jugador} equipo={self.id_equipo} torneo={self.id_torneo}>'
