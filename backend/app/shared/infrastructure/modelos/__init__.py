"""
Importación centralizada de todos los modelos SQLAlchemy.

Este módulo garantiza que Flask-Migrate / Alembic detecte
automáticamente todas las tablas del proyecto.
"""
from app.shared.infrastructure.modelos.usuario import Usuario  # noqa: F401
from app.shared.infrastructure.modelos.torneo import Torneo  # noqa: F401
from app.shared.infrastructure.modelos.categoria import Categoria  # noqa: F401
from app.shared.infrastructure.modelos.equipo import Equipo  # noqa: F401
from app.shared.infrastructure.modelos.jugador import Jugador  # noqa: F401
from app.shared.infrastructure.modelos.inscripcion import Inscripcion  # noqa: F401
from app.shared.infrastructure.modelos.plantilla import Plantilla  # noqa: F401
from app.shared.infrastructure.modelos.partido import Partido  # noqa: F401
from app.shared.infrastructure.modelos.estadistica import Estadistica  # noqa: F401
from app.shared.infrastructure.modelos.sancion import Sancion  # noqa: F401
from app.shared.infrastructure.modelos.documentacion import Documentacion  # noqa: F401
from app.shared.infrastructure.modelos.documento_jugador import DocumentoJugador  # noqa: F401
from app.shared.infrastructure.modelos.patrocinador import Patrocinador  # noqa: F401
from app.shared.infrastructure.modelos.patrocinador_torneo import PatrocinadorTorneo  # noqa: F401
