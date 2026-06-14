"""
Middleware de autenticación y autorización JWT.

Decorador ``@token_required`` que intercepta, decodifica y valida
matemáticamente los tokens JWT emitidos por Supabase Auth antes
de permitir el acceso a endpoints protegidos.

Seguridad aplicada:
    - Algoritmo forzado a HS256 (previene ataques de degradación).
    - Claims ``sub`` y ``exp`` requeridos explícitamente.
    - Inyección de identidad en ``flask.g`` para trazabilidad.
    - Verificación de roles (RBAC) con lista ``allowed_roles`` contra
      la tabla ``Usuarios`` para soportar múltiples roles por ruta.
"""
import os
from functools import wraps

import jwt
from flask import g, jsonify, request

from app import db


def token_required(fn=None, *, allowed_roles=None):
    """Decorador de autenticación y control de acceso basado en roles (RBAC).

    Soporta dos formas de invocación:

    **Solo autenticación** (cualquier usuario con JWT válido)::

        @token_required
        def mi_ruta():
            usuario_id = g.usuario_id   # UUID inyectado desde el claim 'sub'
            ...

    **Con restricción de uno o más roles**::

        @token_required(allowed_roles=['super_admin'])
        def ruta_admin():
            ...

        @token_required(allowed_roles=['super_admin', 'delegado'])
        def ruta_compartida():
            rol = g.usuario_rol   # rol verificado contra la BD
            ...

    Args:
        fn: Función decorada (se recibe automáticamente cuando se usa
            ``@token_required`` sin paréntesis).
        allowed_roles: Lista de roles permitidos para acceder al endpoint
            (ej. ``['super_admin', 'delegado']``). Cuando se especifica,
            el middleware consulta la tabla ``usuarios`` para verificar que
            el rol del usuario esté incluido y que su cuenta esté activa.

    Inyecta en ``flask.g``:
        - ``g.usuario_id`` (str): UUID del usuario autenticado (claim ``sub``).
        - ``g.usuario_rol`` (str | None): Rol del usuario, poblado únicamente
          cuando se activa la verificación RBAC.
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # ── 1. Extraer el token del header Authorization ──────
            auth_header = request.headers.get('Authorization', '')

            if not auth_header.startswith('Bearer '):
                return jsonify({
                    'success': False,
                    'error_code': 'MISSING_TOKEN',
                    'message': (
                        'Token de acceso no proporcionado. '
                        'Incluye el header Authorization: Bearer <token>.'
                    ),
                }), 401

            token = auth_header.split(' ', 1)[1]

            # ── 2. Verificar configuración del servidor ───────────
            supabase_secret = os.getenv('SUPABASE_JWT_SECRET')

            if not supabase_secret:
                return jsonify({
                    'success': False,
                    'error_code': 'SERVER_CONFIG_ERROR',
                    'message': 'El servidor no tiene configurada la clave JWT.',
                }), 500

            # ── 3. Decodificar y validar la firma del JWT ─────────
            #    - algorithms=["HS256"]: previene ataques de degradación
            #      (ej. "alg":"none" o cambio a RS256 con clave pública).
            #    - require=["sub", "exp"]: rechaza tokens sin identidad
            #      o sin fecha de expiración.
            try:
                payload = jwt.decode(
                    token,
                    supabase_secret,
                    algorithms=['HS256'],
                    options={'require': ['sub', 'exp']},
                )
            except jwt.ExpiredSignatureError:
                return jsonify({
                    'success': False,
                    'error_code': 'TOKEN_EXPIRED',
                    'message': 'El token ha expirado. Inicia sesión nuevamente.',
                }), 401
            except jwt.InvalidTokenError:
                return jsonify({
                    'success': False,
                    'error_code': 'INVALID_TOKEN',
                    'message': (
                        'El token es inválido o su firma no pudo ser verificada.'
                    ),
                }), 401

            # ── 4. Inyectar identidad en el contexto de Flask ─────
            #    flask.g es un objeto por-request: cada petición HTTP
            #    tiene su propia instancia aislada. Cualquier ruta o
            #    servicio downstream puede leer g.usuario_id sin
            #    necesidad de pasar el UUID como argumento.
            g.usuario_id = payload['sub']
            g.usuario_rol = None

            # ── 5. Verificación de roles (RBAC) si se requiere ───
            if allowed_roles is not None:
                from app.models.usuario import Usuario

                usuario = db.session.get(Usuario, g.usuario_id)

                if usuario is None:
                    return jsonify({
                        'success': False,
                        'error_code': 'USER_NOT_FOUND',
                        'message': (
                            'El usuario asociado al token no existe '
                            'en el sistema.'
                        ),
                    }), 401

                if usuario.estado != 'activo':
                    return jsonify({
                        'success': False,
                        'error_code': 'USER_INACTIVE',
                        'message': 'La cuenta del usuario está inactiva.',
                    }), 403

                g.usuario_rol = usuario.rol

                if usuario.rol not in allowed_roles:
                    return jsonify({
                        'success': False,
                        'error_code': 'FORBIDDEN',
                        'message': (
                            f'Acceso denegado. Se requiere uno de los siguientes '
                            f'roles para esta operación: '
                            f'{", ".join(f"{chr(39)}{r}{chr(39)}" for r in allowed_roles)}.'
                        ),
                    }), 403

            return fn(*args, **kwargs)

        return wrapper

    # Soporte para @token_required (sin paréntesis)
    # y @token_required(allowed_roles=[...]) (con paréntesis).
    if fn is not None:
        return decorator(fn)
    return decorator
