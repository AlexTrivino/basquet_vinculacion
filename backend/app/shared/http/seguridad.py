"""Cabeceras de seguridad de la API y registro de los pedidos rechazados (401 y 403)."""
from flask import Flask, request


def registrar_seguridad(app: Flask) -> None:
    @app.after_request
    def cabeceras_y_registro(respuesta):
        respuesta.headers.setdefault('X-Content-Type-Options', 'nosniff')
        if request.headers.get('Authorization'):
            respuesta.headers['Cache-Control'] = 'no-store'  # datos personales: ni el navegador ni un proxy los guardan
        if respuesta.status_code in (401, 403):
            cuerpo = respuesta.get_json(silent=True) if respuesta.is_json else None
            app.logger.warning('Acceso rechazado: %s %s %r desde %s (%s)', respuesta.status_code, request.method,
                               request.path, request.remote_addr, (cuerpo or {}).get('error_code'))
        return respuesta
