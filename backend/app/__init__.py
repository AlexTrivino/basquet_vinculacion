"""
Fábrica de la aplicación Flask.

Configura extensiones (SQLAlchemy, Migrate, CORS), registra blueprints
y manejadores de errores centralizados.
"""
import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()


def create_app() -> Flask:
    """Crea y configura la instancia de la aplicación Flask."""
    app = Flask(__name__)

    # ── Configuración ──────────────────────────────────────────────
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5 MB

    # ── Depuración SQLAlchemy (opcional) ─────────────────────────────
    #app.config['SQLALCHEMY_ECHO'] = True

    # ── Extensiones ────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)

    cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173')
    CORS(app, origins=[o.strip() for o in cors_origins.split(',')])

    # ── Modelos (importar para que Alembic los detecte) ────────────
    with app.app_context():
        from app import models  # noqa: F401

    # ── Blueprints ─────────────────────────────────────────────────
    from app.routes.health_bp import health_bp
    from app.routes.torneo_bp import torneo_bp
    from app.routes.categoria_bp import categoria_bp
    from app.routes.equipo_bp import equipo_bp
    from app.routes.inscripcion_bp import inscripcion_bp
    from app.routes.jugador_bp import jugador_bp
    from app.routes.plantilla_bp import plantilla_bp
    from app.routes.partido_bp import partido_bp
    from app.routes.stats_bp import stats_bp
    from app.routes.reportes_bp import reportes_bp
    app.register_blueprint(health_bp)
    app.register_blueprint(torneo_bp)
    app.register_blueprint(categoria_bp)
    app.register_blueprint(equipo_bp)
    app.register_blueprint(inscripcion_bp)
    app.register_blueprint(jugador_bp)
    app.register_blueprint(plantilla_bp)
    app.register_blueprint(partido_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(reportes_bp)

    # ── Manejadores de errores ─────────────────────────────────────
    from app.utils.error_handlers import register_error_handlers
    register_error_handlers(app)

    return app
