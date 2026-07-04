"""
Manejadores de errores HTTP centralizados.

Registra handlers para los códigos de estado más comunes,
devolviendo respuestas JSON con formato estandarizado (RNF-MAN-02).
"""
from flask import Flask, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError
from app import db


def register_error_handlers(app_instance: Flask) -> None:
    """Registra manejadores de errores globales en la aplicación Flask.

    Args:
        app_instance: Instancia de Flask (renombrada para evitar
            colisión de scope con el módulo/paquete ``app``).

    Cada handler devuelve una respuesta JSON con la estructura::

        {
            "success": false,
            "error_code": "<CÓDIGO>",
            "message": "<Mensaje descriptivo>"
        }
    """

    @app_instance.errorhandler(400)
    def bad_request(error):
        """Solicitud incorrecta o con datos inválidos."""
        return jsonify({
            'success': False,
            'error_code': 'BAD_REQUEST',
            'message': 'La solicitud contiene datos inválidos o está mal formada.',
        }), 400

    @app_instance.errorhandler(401)
    def unauthorized(error):
        """Token JWT ausente, expirado o con firma inválida."""
        return jsonify({
            'success': False,
            'error_code': 'UNAUTHORIZED',
            'message': 'No autorizado. El token de acceso es inválido o ha expirado.',
        }), 401

    @app_instance.errorhandler(404)
    def not_found(error):
        """Recurso no encontrado."""
        return jsonify({
            'success': False,
            'error_code': 'NOT_FOUND',
            'message': 'El recurso solicitado no fue encontrado.',
        }), 404

    @app_instance.errorhandler(405)
    def method_not_allowed(error):
        """Método HTTP no permitido para esta ruta."""
        return jsonify({
            'success': False,
            'error_code': 'METHOD_NOT_ALLOWED',
            'message': 'El método HTTP utilizado no está permitido para esta ruta.',
        }), 405

    @app_instance.errorhandler(Exception)
    def internal_server_error(error):
        """Error interno del servidor (captura cualquier excepción no manejada)."""
        db.session.rollback()
        current_app.logger.exception('Error no manejado:')
        return jsonify({
            'success': False,
            'error_code': 'INTERNAL_SERVER_ERROR',
            'message': 'Ocurrió un error inesperado en el servidor.',
        }), 500

    @app_instance.errorhandler(SQLAlchemyError)
    def sqlalchemy_error(error):
        """Error de base de datos o de integridad."""
        db.session.rollback()
        current_app.logger.exception('Error de Base de Datos:')
        return jsonify({
            'success': False,
            'error_code': 'DATABASE_ERROR',
            'message': 'Ocurrió un error de integridad de datos. Verifique que la acción no rompa relaciones existentes.',
        }), 500
