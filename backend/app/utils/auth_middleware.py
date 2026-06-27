"""
Middleware de autenticación y autorización JWT.

Decorador ``@token_required`` que intercepta, decodifica y valida
matemáticamente los tokens JWT emitidos por Supabase Auth antes
de permitir el acceso a endpoints protegidos.

Seguridad aplicada:
    - **JWKS dinámico:** Obtiene las claves públicas desde el endpoint
      JWKS de Supabase para validar tokens firmados con ECC P-256 (ES256).
      Usa ``PyJWKClient(cache_keys=True)`` para cachear las claves y
      evitar una petición HTTP en cada request.
    - **Fallback HS256:** Si el JWKS no contiene la clave del token
      (ej. API Keys legacy de Supabase que usan HS256 con secreto
      simétrico), se intenta la verificación con ``SUPABASE_JWT_SECRET``.
    - Algoritmos permitidos: ``['ES256', 'RS256', 'HS256']``.
    - Claims ``sub`` y ``exp`` requeridos explícitamente.
    - Inyección de identidad en ``flask.g`` para trazabilidad.
    - Verificación de roles (RBAC) con lista ``allowed_roles`` contra
      la tabla ``Usuarios`` para soportar múltiples roles por ruta.
"""
import os
from functools import wraps

import jwt
from jwt import PyJWKClient, PyJWKClientError
from flask import g, jsonify, request

from app import db

# ── Algoritmos aceptados (orden de preferencia) ──────────────────
_ALGORITHMS = ['ES256', 'RS256', 'HS256']

# ── Cliente JWKS (singleton lazy con caché) ──────────────────────
# Se inicializa en el primer request y reutiliza la caché de claves
# para todos los requests subsiguientes (sin HTTP extra).
_jwks_client = None


def _get_jwks_client():
    """Retorna (o crea) el PyJWKClient apuntando al JWKS de Supabase.

    La URL tiene la forma:
        ``https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json``

    ``cache_keys=True`` habilita la caché interna de PyJWKClient:
    las claves descargadas se almacenan en memoria y solo se refrescan
    cuando un ``kid`` desconocido aparece en un token nuevo.
    """
    global _jwks_client

    if _jwks_client is None:
        supabase_url = os.getenv('SUPABASE_URL', '').rstrip('/')
        jwks_url = f'{supabase_url}/auth/v1/.well-known/jwks.json'
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)

    return _jwks_client


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

            # ── 2. Decodificar JWT con JWKS (asimétrico) o fallback HS256
            #
            #    Estrategia de doble intento:
            #      a) JWKS: extrae la clave pública del endpoint JWKS de
            #         Supabase usando el 'kid' del header del token.
            #         Soporta ES256 (ECC P-256) y RS256 (RSA).
            #      b) HS256 fallback: si el JWKS no tiene la clave (API Keys
            #         legacy sin 'kid'), intenta con el secreto simétrico
            #         SUPABASE_JWT_SECRET.
            #
            payload = None

            # ── Intento A: Verificación asimétrica via JWKS ───────
            try:
                jwks_client = _get_jwks_client()
                signing_key = jwks_client.get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=_ALGORITHMS,
                    audience='authenticated',
                    options={'require': ['sub', 'exp']},
                )
            except (PyJWKClientError, jwt.exceptions.PyJWKClientConnectionError):
                # JWKS no disponible o token sin 'kid' → intentar HS256
                pass
            except jwt.ExpiredSignatureError:
                return jsonify({
                    'success': False,
                    'error_code': 'TOKEN_EXPIRED',
                    'message': 'El token ha expirado. Inicia sesión nuevamente.',
                }), 401
            except jwt.InvalidTokenError:
                # Firma inválida con clave JWKS → no intentar fallback,
                # el token fue rechazado criptográficamente.
                return jsonify({
                    'success': False,
                    'error_code': 'INVALID_TOKEN',
                    'message': (
                        'El token es inválido o su firma no pudo ser verificada.'
                    ),
                }), 401

            # ── Intento B: Fallback HS256 con secreto simétrico ───
            if payload is None:
                supabase_secret = os.getenv('SUPABASE_JWT_SECRET')

                if not supabase_secret:
                    return jsonify({
                        'success': False,
                        'error_code': 'SERVER_CONFIG_ERROR',
                        'message': (
                            'El servidor no tiene configuradas las credenciales '
                            'JWT (ni JWKS ni secreto simétrico).'
                        ),
                    }), 500

                try:
                    payload = jwt.decode(
                        token,
                        supabase_secret,
                        algorithms=['HS256'],
                        audience='authenticated',
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
                            'El token es inválido o su firma no pudo ser '
                            'verificada con ningún método (JWKS ni HS256).'
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
