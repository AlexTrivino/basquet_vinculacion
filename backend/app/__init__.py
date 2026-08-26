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

class SafeSQLAlchemy(SQLAlchemy):
    """
    Capa de seguridad (Safeguard) para prevenir borrados accidentales en la base de datos de producción.
    Sobreescribe el método drop_all para que falle inmediatamente si no se cumplen las condiciones de testing.
    """
    def drop_all(self, *args, **kwargs):
        from flask import current_app
        uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
        is_testing = current_app.config.get('TESTING', False)
        
        # Validación estricta: Solo se permite si TESTING es True y la URI es SQLite/Memory.
        if not is_testing or ('sqlite' not in uri and 'memory' not in uri):
            raise RuntimeError(
                "\n" + "="*60 + "\n"
                "🚨 CRITICAL SAFEGUARD ACTIVATED: INTENTO DE DROP_ALL BLOQUEADO 🚨\n"
                "Se intentó borrar la base de datos sin estar en un entorno seguro de pruebas.\n"
                f"TESTING: {is_testing}\n"
                f"URI: {uri}\n"
                "Para proteger los datos, drop_all() está estrictamente limitado a bases de datos SQLite en memoria.\n"
                + "="*60 + "\n"
            )
        super().drop_all(*args, **kwargs)

db = SafeSQLAlchemy()
migrate = Migrate()


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
    from app.routes.usuario_bp import usuario_bp
    from app.routes.sancion_bp import sancion_bp
    from app.routes.config_bp import config_bp
    from app.routes.patrocinador_bp import patrocinador_bp
    
    app.register_blueprint(health_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(torneo_bp)
    app.register_blueprint(categoria_bp)
    app.register_blueprint(equipo_bp)
    app.register_blueprint(inscripcion_bp)
    app.register_blueprint(jugador_bp)
    app.register_blueprint(plantilla_bp)
    app.register_blueprint(partido_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(reportes_bp)
    app.register_blueprint(usuario_bp)
    app.register_blueprint(sancion_bp, url_prefix='/api/sanciones')
    app.register_blueprint(patrocinador_bp)
    # ── Manejadores de errores ─────────────────────────────────────
    from app.utils.error_handlers import register_error_handlers
    register_error_handlers(app)

    return app
