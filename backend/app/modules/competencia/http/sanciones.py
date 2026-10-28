"""Rutas de /api/sanciones. Como siempre, responden sin ``success`` y sin validar la entrada."""
from flask import Blueprint, jsonify, request

from app.modules.competencia.application import sanciones as casos
from app.modules.competencia.http.esquemas import SancionSchema
from app.modules.competencia.infrastructure.repositorio import RepositorioSanciones
from app.shared.http.autenticacion import token_required
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

sancion_bp = Blueprint('sancion_bp', __name__, url_prefix='/api/sanciones')
sancion_schema = SancionSchema()
sanciones_schema = SancionSchema(many=True)


@sancion_bp.route('/', methods=['GET'])
def listar():
    id_jugador = request.args.get('id_jugador', type=int)
    estado = request.args.get('estado', type=str)
    sanciones = casos.listar(id_jugador, estado, RepositorioSanciones())
    return jsonify({'data': sanciones_schema.dump(sanciones), 'message': 'Ok'}), 200


@sancion_bp.route('/', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def crear():
    data = request.get_json()
    sancion = casos.crear(data, repositorio=RepositorioSanciones(), unidad=UnidadDeTrabajo())
    return jsonify({'data': sancion_schema.dump(sancion), 'message': 'Sanción creada'}), 201


@sancion_bp.route('/<int:id>', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def actualizar(id):
    data = request.get_json()
    sancion = casos.actualizar(id, data.get('motivo'), data.get('estado'), repositorio=RepositorioSanciones(), unidad=UnidadDeTrabajo())
    return jsonify({'data': sancion_schema.dump(sancion), 'message': 'Sanción actualizada'}), 200
