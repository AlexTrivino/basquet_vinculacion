"""
Fábrica de la aplicación Flask.

Configura extensiones (SQLAlchemy, Migrate, CORS), registra blueprints
y manejadores de errores centralizados.
"""
import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from app.shared.infrastructure.db import db, migrate  # noqa: F401  (`from app import db` sigue funcionando)

load_dotenv()


def create_app() -> Flask:
    """Crea y configura la instancia de la aplicación Flask."""
    app = Flask(__name__)

    # ── Configuración ──────────────────────────────────────────────
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5 MB

    # ── Opciones del Engine (Pooler de Supabase resiliente) ────────
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,  # Verifica la salud de la conexión antes de ejecutar consultas
        'pool_recycle': 300,    # Recicla conexiones cada 5 minutos para evitar timeouts del pooler
    }

    # ── Depuración SQLAlchemy (opcional) ─────────────────────────────
    #app.config['SQLALCHEMY_ECHO'] = True

    # ── Extensiones ────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)

    cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173')
    CORS(app, origins=[o.strip() for o in cors_origins.split(',')])

    # ── Modelos (importar para que Alembic los detecte) ────────────
    with app.app_context():
        from app.shared.infrastructure import modelos  # noqa: F401  (registra las tablas para Alembic)

    # ── Blueprints ─────────────────────────────────────────────────
    from app.routes.health_bp import health_bp
    from app.modules.torneos.http.torneos import torneo_bp
    from app.modules.torneos.http.categorias import categoria_bp
    from app.routes.lideres_bp import lideres_bp
    from app.modules.plantel.http.equipos import equipo_bp
    from app.routes.inscripcion_bp import inscripcion_bp
    from app.modules.plantel.http.jugadores import jugador_bp
    from app.routes.plantilla_bp import plantilla_bp
    from app.modules.competencia.http.partidos import partido_bp
    from app.routes.stats_bp import stats_bp
    from app.routes.reportes_bp import reportes_bp
    from app.routes.usuario_bp import usuario_bp
    from app.modules.competencia.http.sanciones import sancion_bp
    from app.modules.competencia.http.fase_final import competencia_bp
    from app.routes.config_bp import config_bp
    from app.modules.auspicios.http.rutas import patrocinador_bp
    from app.modules.plantel.http.visor import visor_bp
    
    app.register_blueprint(health_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(torneo_bp)
    app.register_blueprint(lideres_bp)
    app.register_blueprint(competencia_bp)
    app.register_blueprint(categoria_bp)
    app.register_blueprint(equipo_bp)
    app.register_blueprint(inscripcion_bp)
    app.register_blueprint(jugador_bp)
    app.register_blueprint(plantilla_bp)
    app.register_blueprint(partido_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(reportes_bp)
    app.register_blueprint(usuario_bp)
    app.register_blueprint(sancion_bp)
    app.register_blueprint(patrocinador_bp)
    app.register_blueprint(visor_bp)
    # ── Manejadores de errores ─────────────────────────────────────
    from app.shared.http.errores import register_error_handlers
    register_error_handlers(app)

    return app
