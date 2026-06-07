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

    # ── Extensiones ────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)

    cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173')
    CORS(app, origins=[o.strip() for o in cors_origins.split(',')])

    # ── Modelos (importar para que Alembic los detecte) ────────────
    with app.app_context():
        import app.models  # noqa: F401

    # ── Blueprints ─────────────────────────────────────────────────
    # Los blueprints se registrarán a medida que se creen las rutas.
    # from app.routes import ...
    # app.register_blueprint(...)

    # ── Manejadores de errores ─────────────────────────────────────
    from app.utils.error_handlers import register_error_handlers
    register_error_handlers(app)

    return app
