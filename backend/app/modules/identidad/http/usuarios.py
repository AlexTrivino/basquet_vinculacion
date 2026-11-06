"""Rutas del perfil propio: /api/usuarios/me. Responden como antes; el cuerpo se valida aquí."""
from flask import Blueprint, g, request

from app.modules.identidad.application import casos_de_uso as casos
from app.modules.identidad.infrastructure.repositorio import RepositorioUsuarios
from app.shared.http.autenticacion import ROLES_VALIDOS, token_required
from app.shared.http.respuestas import api_error, api_response
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

usuario_bp = Blueprint('usuarios', __name__, url_prefix='/api/usuarios')


def _dict(u):
    return {
        'id_usuario': u.id_usuario,
        'nombre': u.nombre,
        'correo': u.correo,
        'rol': u.rol,
        'estado': u.estado,
        'created_at': u.created_at.isoformat() if u.created_at else None,
        'updated_at': u.updated_at.isoformat() if u.updated_at else None,
    }


@usuario_bp.route('/me', methods=['GET'])
@token_required(allowed_roles=ROLES_VALIDOS)  # como el resto de la API: la cuenta tiene que existir y estar activa
def obtener_perfil():
    """Los datos del usuario autenticado."""
    return api_response(_dict(casos.obtener(g.usuario_id, RepositorioUsuarios())))


@usuario_bp.route('/me', methods=['PUT'])
@token_required(allowed_roles=ROLES_VALIDOS)
def actualizar_perfil():
    """Cambia el nombre del usuario autenticado; lo demás del cuerpo se ignora, como siempre."""
    repositorio = RepositorioUsuarios()
    casos.obtener(g.usuario_id, repositorio)  # como hoy: primero el 404, después el cuerpo
    data = request.get_json(silent=True)
    if not data or 'nombre' not in data:
        return api_error('BAD_REQUEST', 'El campo nombre es requerido.', 400)
    nombre = data['nombre'].strip() if isinstance(data['nombre'], str) else ''
    if not 1 <= len(nombre) <= 100:  # la columna es de 100
        return api_error('VALIDATION_ERROR', 'El nombre debe ser un texto de 1 a 100 caracteres.', 422)
    usuario = casos.cambiar_nombre(g.usuario_id, nombre, repositorio=repositorio, unidad=UnidadDeTrabajo())
    return api_response(_dict(usuario), message='Perfil actualizado exitosamente.')
