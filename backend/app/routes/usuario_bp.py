from flask import Blueprint, request, g
from app import db
from app.models.usuario import Usuario
from app.utils.auth_middleware import token_required
from app.utils.response import api_response, api_error

usuario_bp = Blueprint('usuarios', __name__, url_prefix='/api/usuarios')

@usuario_bp.route('/me', methods=['GET'])
@token_required()
def obtener_perfil():
    """Obtiene los datos del usuario autenticado."""
    usuario = db.session.execute(
        db.select(Usuario).filter_by(id_usuario=g.usuario_id)
    ).scalar_one_or_none()
    
    if not usuario:
        return api_error('NOT_FOUND', 'Usuario no encontrado.', 404)
        
    return api_response(usuario.to_dict())

@usuario_bp.route('/me', methods=['PUT'])
@token_required()
def actualizar_perfil():
    """Actualiza el nombre del usuario autenticado."""
    usuario = db.session.execute(
        db.select(Usuario).filter_by(id_usuario=g.usuario_id)
    ).scalar_one_or_none()
    
    if not usuario:
        return api_error('NOT_FOUND', 'Usuario no encontrado.', 404)
        
    data = request.get_json(silent=True)
    if not data or 'nombre' not in data:
        return api_error('BAD_REQUEST', 'El campo nombre es requerido.', 400)
        
    usuario.nombre = data.get('nombre')
    db.session.commit()
    
    return api_response(usuario.to_dict(), message='Perfil actualizado exitosamente.')
