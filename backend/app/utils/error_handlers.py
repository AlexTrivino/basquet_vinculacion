"""
Manejadores de errores HTTP centralizados.

Registra handlers para los códigos de estado más comunes,
devolviendo respuestas JSON con formato estandarizado.
"""
from flask import Flask, jsonify


def register_error_handlers(app: Flask) -> None:
    """Registra manejadores de errores globales en la aplicación Flask.

    Cada handler devuelve una respuesta JSON con la estructura:
        {
            "success": false,
            "error_code": "<CÓDIGO>",
            "message": "<Mensaje descriptivo>"
        }
    """

    @app.errorhandler(400)
    def bad_request(error):
        """Solicitud incorrecta o con datos inválidos."""
        return jsonify({
            'success': False,
            'error_code': 'BAD_REQUEST',
            'message': 'La solicitud contiene datos inválidos o está mal formada.',
        }), 400

    @app.errorhandler(404)
    def not_found(error):
        """Recurso no encontrado."""
        return jsonify({
            'success': False,
            'error_code': 'NOT_FOUND',
            'message': 'El recurso solicitado no fue encontrado.',
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        """Método HTTP no permitido para esta ruta."""
        return jsonify({
            'success': False,
            'error_code': 'METHOD_NOT_ALLOWED',
            'message': 'El método HTTP utilizado no está permitido para esta ruta.',
        }), 405

    @app.errorhandler(500)
    def internal_server_error(error):
        """Error interno del servidor."""
        return jsonify({
            'success': False,
            'error_code': 'INTERNAL_SERVER_ERROR',
            'message': 'Ocurrió un error interno en el servidor.',
        }), 500
