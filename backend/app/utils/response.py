"""
Helper de respuestas JSON estandarizadas para la API (RNF-MAN-02).

Centraliza el formato de todas las respuestas para garantizar
consistencia entre endpoints y facilitar el consumo del frontend.

Uso::

    from app.utils.response import api_response, api_error

    # Éxito con datos
    return api_response(data=torneo.to_dict(), status=201)

    # Éxito con mensaje
    return api_response(message='Equipo registrado.', status=201)

    # Éxito paginado
    return api_response(data=[...], pagination={...})

    # Error controlado
    return api_error('VALIDATION_ERROR', 'Edad inválida.', 422)
"""
from flask import jsonify


def api_response(data=None, message='', status=200, pagination=None):
    """Construye una respuesta JSON exitosa estandarizada.

    Args:
        data: Datos a incluir (dict, list o None).
        message: Mensaje descriptivo para el cliente.
        status: Código HTTP (default 200).
        pagination: Dict con metadatos de paginación (opcional).

    Returns:
        Tuple ``(Response, status_code)`` lista para retornar en Flask.
    """
    body = {'success': status < 400}

    if message:
        body['message'] = message

    if data is not None:
        body['data'] = data

    if pagination is not None:
        body['pagination'] = pagination

    return jsonify(body), status


def api_error(error_code, message, status=400, data=None):
    """Construye una respuesta JSON de error estandarizada.

    Args:
        error_code: Código legible por máquina (ej. ``'VALIDATION_ERROR'``).
        message: Mensaje legible por humanos.
        status: Código HTTP de error (default 400).
        data: Datos adicionales del error (opcional).

    Returns:
        Tuple ``(Response, status_code)``.
    """
    body = {
        'success': False,
        'error_code': error_code,
        'message': message,
    }
    if data is not None:
        body['data'] = data

    return jsonify(body), status
