"""
Importación centralizada de todos los modelos SQLAlchemy.

Este módulo garantiza que Flask-Migrate / Alembic detecte
automáticamente todas las tablas del proyecto.
"""
from app.models.usuario import Usuario  # noqa: F401
from app.models.torneo import Torneo  # noqa: F401
from app.models.categoria import Categoria  # noqa: F401
from app.models.equipo import Equipo  # noqa: F401
from app.models.jugador import Jugador  # noqa: F401
from app.models.inscripcion import Inscripcion  # noqa: F401
from app.models.plantilla import Plantilla  # noqa: F401
from app.models.partido import Partido  # noqa: F401
from app.models.estadistica import Estadistica  # noqa: F401
from app.models.sancion import Sancion  # noqa: F401
from app.models.documentacion import Documentacion  # noqa: F401
from app.models.documento_jugador import DocumentoJugador  # noqa: F401
from app.models.patrocinador import Patrocinador  # noqa: F401
from app.models.patrocinador_torneo import PatrocinadorTorneo  # noqa: F401
