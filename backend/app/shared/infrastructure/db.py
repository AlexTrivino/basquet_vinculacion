"""Conexión a la base (Flask-SQLAlchemy) y migraciones (Flask-Migrate), compartidas por todos los módulos."""
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy


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
