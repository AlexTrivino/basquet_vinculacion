from flask import Blueprint, request, jsonify
from app.services import sancion_service
from app.schemas.sancion_schema import SancionSchema
from app.utils.auth_middleware import token_required

sancion_bp = Blueprint('sancion_bp', __name__)
sancion_schema = SancionSchema()
sanciones_schema = SancionSchema(many=True)

@sancion_bp.route('/', methods=['GET'])
def listar():
    id_jugador = request.args.get('id_jugador', type=int)
    estado = request.args.get('estado', type=str)
    sanciones = sancion_service.listar_sanciones(id_jugador, estado).all()
    return jsonify({'data': sanciones_schema.dump(sanciones), 'message': 'Ok'}), 200

@sancion_bp.route('/', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def crear():
    data = request.get_json()
    sancion = sancion_service.crear_sancion(data)
    return jsonify({'data': sancion_schema.dump(sancion), 'message': 'Sanción creada'}), 201

@sancion_bp.route('/<int:id>', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def actualizar(id):
    data = request.get_json()
    sancion = sancion_service.actualizar_sancion(id, data.get('motivo'), data.get('estado'))
    return jsonify({'data': sancion_schema.dump(sancion), 'message': 'Sanción actualizada'}), 200
