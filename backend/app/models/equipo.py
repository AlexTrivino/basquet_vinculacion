"""Modelo de Equipo — clubes registrados por delegados."""
from app import db


class Equipo(db.Model):
    """Representa un equipo de baloncesto gestionado por un delegado."""

    __tablename__ = 'equipos'

    id_equipo = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre_equipo = db.Column(db.String(100), nullable=False)
    estado = db.Column(db.String(20), nullable=False, default='activo')
    url_logo = db.Column(db.Text, nullable=True)
    url_foto_equipo = db.Column(db.Text, nullable=True)
    id_usuario = db.Column(
        db.String(36), db.ForeignKey('usuarios.id_usuario'), nullable=False
    )

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    usuario = db.relationship('Usuario', back_populates='equipos', lazy='select')
    inscripciones = db.relationship('Inscripcion', back_populates='equipo', lazy='select')
    plantillas = db.relationship('Plantilla', back_populates='equipo', lazy='select')
    partidos_local = db.relationship(
        'Partido',
        foreign_keys='Partido.id_equipo_local',
        back_populates='equipo_local',
        lazy='select',
    )
    partidos_visitante = db.relationship(
        'Partido',
        foreign_keys='Partido.id_equipo_visitante',
        back_populates='equipo_visitante',
        lazy='select',
    )

    # ── Restricciones ──────────────────────────────────────────────
    __table_args__ = (
        db.CheckConstraint("estado IN ('activo', 'inactivo')", name='ck_equipos_estado'),
    )

    @classmethod
    def activos(cls):
        """Retorna query filtrada excluyendo registros inactivos (soft delete)."""
        return cls.query.filter_by(estado='activo')

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_equipo': self.id_equipo,
            'nombre_equipo': self.nombre_equipo,
            'estado': self.estado,
            'url_logo': self.url_logo,
            'url_foto_equipo': self.url_foto_equipo,
            'id_usuario': self.id_usuario,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<Equipo {self.nombre_equipo}>'
