"""Modelo de Partido — encuentros programados dentro de un torneo."""
from app import db


class Partido(db.Model):
    """Representa un partido entre dos equipos dentro de un torneo."""

    __tablename__ = 'partidos'

    id_partido = db.Column(db.Integer, primary_key=True, autoincrement=True)
    fecha = db.Column(db.Date, nullable=False)
    hora = db.Column(db.Time, nullable=False)
    estado = db.Column(db.String(20), nullable=False, default='programado')
    marcador_local = db.Column(db.Integer, nullable=False, default=0)
    marcador_visitante = db.Column(db.Integer, nullable=False, default=0)
    fase = db.Column(db.String(50), nullable=False)
    ubicacion = db.Column(db.String(150), nullable=False, default='Coliseo Pablo Delgado Álava')
    url_planilla_fiba = db.Column(db.Text, nullable=True)
    id_torneo = db.Column(
        db.Integer, db.ForeignKey('torneos.id_torneo'), nullable=False
    )
    id_equipo_local = db.Column(
        db.Integer, db.ForeignKey('equipos.id_equipo'), nullable=False
    )
    id_equipo_visitante = db.Column(
        db.Integer, db.ForeignKey('equipos.id_equipo'), nullable=False
    )

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    torneo = db.relationship('Torneo', back_populates='partidos', lazy='select')
    equipo_local = db.relationship(
        'Equipo',
        foreign_keys=[id_equipo_local],
        back_populates='partidos_local',
        lazy='select',
    )
    equipo_visitante = db.relationship(
        'Equipo',
        foreign_keys=[id_equipo_visitante],
        back_populates='partidos_visitante',
        lazy='select',
    )
    sanciones = db.relationship('Sancion', back_populates='partido', lazy='select')
    estadisticas = db.relationship('Estadistica', back_populates='partido', lazy='select')

    # ── Restricciones ──────────────────────────────────────────────
    __table_args__ = (
        db.CheckConstraint(
            "estado IN ('programado', 'en_curso', 'finalizado', 'suspendido')",
            name='ck_partidos_estado',
        ),
    )

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_partido': self.id_partido,
            'fecha': self.fecha.isoformat() if self.fecha else None,
            'hora': self.hora.isoformat() if self.hora else None,
            'estado': self.estado,
            'marcador_local': self.marcador_local,
            'marcador_visitante': self.marcador_visitante,
            'fase': self.fase,
            'ubicacion': self.ubicacion,
            'url_planilla_fiba': self.url_planilla_fiba,
            'id_torneo': self.id_torneo,
            'id_equipo_local': self.id_equipo_local,
            'id_equipo_visitante': self.id_equipo_visitante,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<Partido {self.id_equipo_local} vs {self.id_equipo_visitante} ({self.estado})>'
