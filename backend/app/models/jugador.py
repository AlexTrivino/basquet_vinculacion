"""Modelo de Jugador — deportistas participantes en torneos."""
from app import db


class Jugador(db.Model):
    """Representa un jugador de baloncesto con datos personales y documentación."""

    __tablename__ = 'jugadores'

    id_jugador = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(200), nullable=False)
    genero = db.Column(db.String(20), nullable=True)
    documento_identificacion = db.Column(db.String(20), unique=True, nullable=False)
    fecha_nacimiento = db.Column(db.Date, nullable=False)
    url_foto = db.Column(db.Text, nullable=True)
    url_cedula = db.Column(db.Text, nullable=True)
    url_acta_bachiller = db.Column(db.Text, nullable=True)
    correo = db.Column(db.String(150), nullable=True)
    telefono = db.Column(db.String(20), nullable=True)
    estado = db.Column(db.String(20), nullable=False, default='activo')

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    documentos = db.relationship('DocumentoJugador', back_populates='jugador', lazy='select')
    plantillas = db.relationship('Plantilla', back_populates='jugador', lazy='select')
    sanciones = db.relationship('Sancion', back_populates='jugador', lazy='select')
    estadisticas = db.relationship('Estadistica', back_populates='jugador', lazy='select')

    # ── Restricciones ──────────────────────────────────────────────
    __table_args__ = (
        db.CheckConstraint("estado IN ('activo', 'inactivo')", name='ck_jugadores_estado'),
        db.CheckConstraint(
            "genero IS NULL OR genero IN ('masculino', 'femenino')", name='ck_jugadores_genero'
        ),
    )

    @classmethod
    def activos(cls):
        """Retorna query filtrada excluyendo registros inactivos (soft delete)."""
        return cls.query.filter_by(estado='activo')

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_jugador': self.id_jugador,
            'nombre': self.nombre,
            'genero': self.genero,
            'documento_identificacion': self.documento_identificacion,
            'fecha_nacimiento': self.fecha_nacimiento.isoformat() if self.fecha_nacimiento else None,
            'url_foto': self.url_foto,
            'url_cedula': self.url_cedula,
            'url_acta_bachiller': self.url_acta_bachiller,
            'correo': self.correo,
            'telefono': self.telefono,
            'estado': self.estado,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<Jugador {self.nombre}>'
