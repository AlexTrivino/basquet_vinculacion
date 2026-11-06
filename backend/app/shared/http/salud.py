"""GET /api/health: la API está viva y llega a PostgreSQL (SELECT 1). Es de toda la app, no de un módulo."""
from flask import Blueprint, jsonify
from sqlalchemy import text

from app.shared.infrastructure.db import db

health_bp = Blueprint('health', __name__, url_prefix='/api')


@health_bp.route('/health', methods=['GET'])
def health_check():
    """200 si la base responde; 500 DB_CONNECTION_ERROR si no."""
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
