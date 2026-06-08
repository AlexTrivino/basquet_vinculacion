"""Blueprint de verificación de salud de la API y conectividad a PostgreSQL."""
from flask import Blueprint, jsonify
from sqlalchemy import text

from app import db

health_bp = Blueprint('health', __name__, url_prefix='/api')


@health_bp.route('/health', methods=['GET'])
def health_check():
    """Verifica que la API esté operativa y la conexión a PostgreSQL funcione.

    Ejecuta ``SELECT 1`` contra la base de datos para confirmar que
    el pool de conexiones de SQLAlchemy está activo.

    Returns:
        200: API y base de datos operativas.
        500: Fallo de conexión a la base de datos.
    """
    try:
        db.session.execute(text('SELECT 1'))
        return jsonify({
            'success': True,
            'message': 'API operativa.',
            'database': 'conectada',
        }), 200
    except Exception:
        return jsonify({
            'success': False,
            'error_code': 'DB_CONNECTION_ERROR',
            'message': 'No se pudo establecer conexión con la base de datos.',
        }), 500
