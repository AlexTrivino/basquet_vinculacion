"""Rutas de /api/inscripciones: el listado público, el de super_admin y delegados (cada delegado, las de sus equipos),
el alta y la reinscripción, el comprobante, el envío a revisión y la gestión del super_admin (estado, edición,
retiro y purga). Validan la entrada y llaman a los casos de uso."""
from datetime import datetime, timezone

from flask import Blueprint, current_app, g, request
from marshmallow import ValidationError

from app.modules.inscripciones.application import inscripciones as casos
from app.modules.inscripciones.domain.inscripcion import SinCupoParaClubNuevo
from app.modules.inscripciones.http.esquemas import (
    InscripcionAdminSchema, InscripcionCreateSchema, InscripcionEditarSchema, InscripcionEstadoSchema, InscripcionPublicSchema,
    InscripcionReinscribirSchema,
)
from app.modules.inscripciones.infrastructure.repositorio import RepositorioInscripciones
from app.shared.domain.errores import ErrorDeDominio, ReglaDeNegocio
from app.shared.http.autenticacion import token_required
from app.shared.http.paginacion import pagina_pedida
from app.shared.http.respuestas import api_error, api_response
from app.shared.infrastructure import almacenamiento
from app.shared.infrastructure.almacenamiento import MAX_COMPROBANTE, MAX_LOGO_EQUIPO, TIPOS_DOCUMENTO, TIPOS_IMAGEN, validar_archivo
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

inscripcion_bp = Blueprint('inscripciones', __name__, url_prefix='/api/inscripciones')

_public_schema = InscripcionPublicSchema()
_public_many = InscripcionPublicSchema(many=True)
_admin_schema = InscripcionAdminSchema()
_admin_many = InscripcionAdminSchema(many=True)
_create_schema = InscripcionCreateSchema()
_reinscribir_schema = InscripcionReinscribirSchema()
_estado_schema = InscripcionEstadoSchema()
_editar_schema = InscripcionEditarSchema()


def _piezas():
    return {'repositorio': RepositorioInscripciones(), 'unidad': UnidadDeTrabajo()}


def _cuerpo(schema):
    """(datos, None) o (None, la respuesta de error) con los mensajes de hoy."""
    json_data = request.get_json(silent=True)
    if json_data is None:
        return None, api_error('BAD_REQUEST', 'El cuerpo de la solicitud debe ser JSON válido.', 400)
    try:
        return schema.load(json_data), None
    except ValidationError as err:
        return None, api_error('VALIDATION_ERROR', err.messages, 422)


@inscripcion_bp.route('/publicas', methods=['GET'])
def listar_inscripciones_publicas():
    """Inscripciones aprobadas, con paginación. Filtros opcionales: ``id_torneo`` e ``id_equipo``."""
    items, pagination = casos.listar_publicas(*pagina_pedida(), RepositorioInscripciones(),
                                              id_torneo=request.args.get('id_torneo', type=int),
                                              id_equipo=request.args.get('id_equipo', type=int))
    return api_response(data=_public_many.dump(items), pagination=pagination)


@inscripcion_bp.route('', methods=['GET'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def listar_inscripciones():
    """Inscripciones con paginación; un delegado ve solo las de sus equipos. Filtros: ``id_torneo``, ``estado``,
    ``id_categoria`` e ``id_equipo``."""
    items, pagination, completo = casos.listar(
        *pagina_pedida(), g.usuario_id, g.usuario_rol, RepositorioInscripciones(),
        id_torneo=request.args.get('id_torneo', type=int),
        estado=request.args.get('estado'),
        id_categoria=request.args.get('id_categoria', type=int),
        id_equipo=request.args.get('id_equipo', type=int),
    )
    return api_response(data=(_admin_many if completo else _public_many).dump(items), pagination=pagination)


@inscripcion_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def crear_inscripcion():
    """Inscribe un equipo en una categoría de un torneo programado; 409 si ya lo está."""
    data, error = _cuerpo(_create_schema)
    if error:
        return error
    inscripcion = casos.crear(data, **_piezas())
    return api_response(data=_admin_schema.dump(inscripcion), message='Inscripción registrada exitosamente.', status=201)


@inscripcion_bp.route('/reinscribir', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def reinscribir_equipo():
    """Reinscribe en borrador un equipo que ya jugó, con la opción de clonar su plantilla anterior."""
    data, error = _cuerpo(_reinscribir_schema)
    if error:
        return error
    clonar = data.pop('clonar_plantilla', False)
    inscripcion = casos.reinscribir(data, clonar, **_piezas())
    return api_response(data=_admin_schema.dump(inscripcion),
                        message='Equipo reinscrito exitosamente. Por favor, suba el nuevo comprobante de pago.', status=201)


@inscripcion_bp.route('/<int:id_inscripcion>/estado', methods=['PATCH'])
@token_required(allowed_roles=['super_admin'])
def cambiar_estado(id_inscripcion):
    """Pone la inscripción en borrador, pendiente o aprobada; rechazarla la borra con su equipo y sus jugadores nuevos."""
    data, error = _cuerpo(_estado_schema)
    if error:
        return error
    estado = data['estado_inscripcion']
    inscripcion = casos.cambiar_estado(id_inscripcion, estado, almacen=almacenamiento, **_piezas())
    if inscripcion is None:
        return api_response(message='Inscripción rechazada. El equipo y sus datos asociados fueron eliminados permanentemente.')
    return api_response(data=_admin_schema.dump(inscripcion), message=f"Estado actualizado a '{estado}' exitosamente.")


@inscripcion_bp.route('/<int:id_inscripcion>/editar', methods=['PATCH'])
@token_required(allowed_roles=['super_admin'])
def editar_inscripcion(id_inscripcion):
    """Cambia el torneo y la categoría de una inscripción, con su plantilla."""
    data, error = _cuerpo(_editar_schema)
    if error:
        return error
    try:
        inscripcion = casos.editar(id_inscripcion, data['id_torneo'], data['id_categoria'], **_piezas())
    except ErrorDeDominio as e:  # como siempre: todo error de la edición, aun la inscripción que no existe, es 400
        return api_error('VALIDATION_ERROR', str(e), 400)
    except Exception as e:
        current_app.logger.exception(f"Error al editar inscripción {id_inscripcion}: {e}")
        return api_error('SERVER_ERROR', 'Ocurrió un error inesperado al editar la inscripción.', 500)
    return api_response(data=_admin_schema.dump(inscripcion), message='Inscripción y plantillas actualizadas exitosamente.')


@inscripcion_bp.route('/<int:id_inscripcion>', methods=['DELETE'])
@token_required(allowed_roles=['delegado'])
def eliminar_borrador_inscripcion(id_inscripcion):
    """Un delegado borra su inscripción en borrador, con su plantilla, sus jugadores nuevos y su equipo nuevo."""
    try:
        casos.eliminar_borrador(id_inscripcion, g.usuario_id, almacen=almacenamiento, **_piezas())
    except ErrorDeDominio as e:  # como siempre, 400
        return api_error('VALIDATION_ERROR', str(e), 400)
    except Exception as e:
        current_app.logger.exception(f"Error al eliminar borrador de inscripción {id_inscripcion}: {e}")
        return api_error('SERVER_ERROR', 'Ocurrió un error inesperado al eliminar el borrador.', 500)
    return api_response(message='El borrador de inscripción fue eliminado correctamente.')


@inscripcion_bp.route('/<int:id_inscripcion>/retirar', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def retirar_equipo(id_inscripcion):
    """Retira a un equipo aprobado del torneo y borra sus partidos programados."""
    try:
        inscripcion = casos.retirar(id_inscripcion, **_piezas())
    except ReglaDeNegocio as e:  # como siempre, 400
        return api_error('VALIDATION_ERROR', str(e), 400)
    return api_response(data=_admin_schema.dump(inscripcion), message='El equipo ha sido retirado del torneo exitosamente.')


@inscripcion_bp.route('/<int:id_inscripcion>/comprobante', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def subir_comprobante(id_inscripcion):
    """Sube el comprobante de pago (PDF, Excel o imagen) por multipart/form-data, en el campo 'archivo'; un delegado,
    solo de las inscripciones de sus equipos."""
    piezas = _piezas()
    casos.para_gestionar(id_inscripcion, g.usuario_id, g.usuario_rol,
                         'No tienes permiso para subir documentos de esta inscripción.', piezas['repositorio'])
    if 'archivo' not in request.files:
        return api_error('BAD_REQUEST', "No se encontró el campo 'archivo' en la solicitud. "
                                        "Usa multipart/form-data con el campo 'archivo'.", 400)
    archivo = request.files['archivo']
    if archivo.filename == '':
        return api_error('BAD_REQUEST', 'No se seleccionó ningún archivo.', 400)
    try:
        mime = validar_archivo(archivo.stream, tipos_aceptados=TIPOS_DOCUMENTO | TIPOS_IMAGEN, max_bytes=MAX_COMPROBANTE)
    except ValueError as e:
        return api_error('UNSUPPORTED_MEDIA_TYPE', str(e), 415)
    try:
        url = casos.subir_comprobante(id_inscripcion, archivo.stream, archivo.filename, mime, almacen=almacenamiento, **piezas)
    except RuntimeError as e:
        return api_error('STORAGE_ERROR', str(e), 502)
    return api_response(data={'url_comprobante_pago': url}, message='Comprobante subido exitosamente.', status=201)


@inscripcion_bp.route('/completa', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def crear_inscripcion_completa():
    """Abre el club del delegado con su inscripción en borrador y el comprobante (y el logo, opcional), todo o nada."""
    nombre_equipo = request.form.get('nombre_equipo')
    id_torneo = request.form.get('id_torneo')
    id_categoria = request.form.get('id_categoria')
    if not all([nombre_equipo, id_torneo, id_categoria]):
        return api_error('BAD_REQUEST', 'Faltan datos obligatorios (nombre_equipo, id_torneo, id_categoria).', 400)
    if 'archivo' not in request.files:
        return api_error('BAD_REQUEST', 'No se encontró el campo archivo.', 400)
    archivo = request.files['archivo']
    if archivo.filename == '':
        return api_error('BAD_REQUEST', 'No se seleccionó ningún archivo.', 400)
    try:
        mime = validar_archivo(archivo.stream, tipos_aceptados=TIPOS_DOCUMENTO | TIPOS_IMAGEN, max_bytes=MAX_COMPROBANTE)
    except ValueError as e:
        return api_error('UNSUPPORTED_MEDIA_TYPE', str(e), 415)
    logo = None
    logo_file = request.files.get('logo')
    if logo_file:
        try:
            logo = (logo_file.stream, logo_file.filename,
                    validar_archivo(logo_file.stream, tipos_aceptados=TIPOS_IMAGEN, max_bytes=MAX_LOGO_EQUIPO))
        except ValueError as e:
            return api_error('UNSUPPORTED_MEDIA_TYPE', f'Logo: {e}', 415)
    try:
        inscripcion = casos.crear_completa(nombre_equipo, id_torneo, id_categoria, (archivo.stream, archivo.filename, mime), logo,
                                           g.usuario_id, almacen=almacenamiento, **_piezas())
    except SinCupoParaClubNuevo as e:
        return api_error('CONFLICT', str(e), 409)
    except Exception as e:
        current_app.logger.exception(f'Error en inscripción: {e}')
        return api_error('SERVER_ERROR', 'Ocurrió un error inesperado al procesar la inscripción.', 500)
    return api_response(data=_admin_schema.dump(inscripcion),
                        message='Datos del club y comprobante registrados en borrador. Procede al registro de jugadores.', status=201)


@inscripcion_bp.route('/<int:id_inscripcion>/finalizar-borrador', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def finalizar_borrador_inscripcion(id_inscripcion):
    """Envía a revisión una inscripción con comprobante y una plantilla de 5 a 18 jugadores con dorsales distintos."""
    try:
        inscripcion = casos.enviar_a_revision(id_inscripcion, g.usuario_id, g.usuario_rol, **_piezas())
    except ReglaDeNegocio as e:  # como siempre, con el código UNPROCESSABLE_ENTITY
        return api_error('UNPROCESSABLE_ENTITY', str(e), 422)
    schema = _admin_schema if g.usuario_rol == 'super_admin' else _public_schema
    return api_response(data=schema.dump(inscripcion), message='Inscripción enviada exitosamente a revisión con su nómina de jugadores.',
                        status=200)


@inscripcion_bp.route('/purgar-expiradas', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def purgar_expiradas():
    """Borra los borradores y rechazos sin movimiento en ``dias`` días (30 si no se dice)."""
    dias = request.args.get('dias', default=30, type=int)
    if dias < 1:
        return api_error('BAD_REQUEST', 'El parámetro días debe ser un entero positivo.', 400)
    resultado = casos.purgar_expiradas(dias, datetime.now(timezone.utc), almacen=almacenamiento, **_piezas())
    return api_response(
        data=resultado,
        message=f"Purga completada: {resultado['inscripciones_purgadas']} inscripción(es) y {resultado['equipos_eliminados']} equipo(s) eliminados.",
        status=200,
    )
