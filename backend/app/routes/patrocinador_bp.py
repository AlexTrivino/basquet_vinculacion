from flask import Blueprint, request
from marshmallow import ValidationError

from app import db
from app.models.patrocinador import Patrocinador
from app.schemas.patrocinador_schema import patrocinador_schema, patrocinadores_schema
from app.utils.auth_middleware import token_required
from app.utils.storage import subir_archivo, validar_archivo, borrar_archivo, TIPOS_IMAGEN, MAX_LOGO_PATROCINADOR
from app.utils.response import api_response, api_error

patrocinador_bp = Blueprint('patrocinadores', __name__, url_prefix='/api/patrocinadores')


@patrocinador_bp.route('', methods=['GET'])
def get_patrocinadores():
    """Obtiene la lista de patrocinadores (Público)."""
    patrocinadores = Patrocinador.query.order_by(Patrocinador.created_at.desc()).all()
    return api_response(data=patrocinadores_schema.dump(patrocinadores))


@patrocinador_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def create_patrocinador():
    """Crea un nuevo patrocinador con su logo."""
    # Los datos vienen en FormData (form y files)
    try:
        datos = patrocinador_schema.load(request.form)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', "Datos inválidos", status=422, data=err.messages)

    archivo_logo = request.files.get('logo')
    if not archivo_logo or not archivo_logo.filename:
        return api_error('MISSING_FILE', "El archivo del logo es obligatorio.", status=422)

    try:
        mime_type = validar_archivo(archivo_logo.stream, TIPOS_IMAGEN, MAX_LOGO_PATROCINADOR)
    except ValueError as e:
        return api_error('INVALID_FILE', str(e), status=400)

    url_logo = subir_archivo(
        file_stream=archivo_logo.stream,
        nombre_original=archivo_logo.filename,
        carpeta='patrocinadores',
        mime_type=mime_type
    )

    nuevo_patrocinador = Patrocinador(
        nombre_patrocinador=datos['nombre_patrocinador'],
        url_logo_patrocinador=url_logo,
        url_imagen_promocional=datos.get('url_imagen_promocional')
    )

    db.session.add(nuevo_patrocinador)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        # Intentar borrar la imagen subida en caso de error de BD
        borrar_archivo(url_logo)
        return api_error('DB_ERROR', "Error al guardar el patrocinador en la base de datos.", status=500)

    return api_response(
        message="Patrocinador creado exitosamente.",
        data=patrocinador_schema.dump(nuevo_patrocinador),
        status=201
    )


@patrocinador_bp.route('/<int:id_patrocinador>', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def update_patrocinador(id_patrocinador):
    """Actualiza los datos de un patrocinador y su logo opcionalmente."""
    patrocinador = db.session.get(Patrocinador, id_patrocinador)
    if not patrocinador:
        return api_error('NOT_FOUND', "Patrocinador no encontrado.", status=404)

    try:
        datos = patrocinador_schema.load(request.form)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', "Datos inválidos", status=422, data=err.messages)

    patrocinador.nombre_patrocinador = datos['nombre_patrocinador']
    if 'url_imagen_promocional' in datos:
        patrocinador.url_imagen_promocional = datos['url_imagen_promocional']

    archivo_logo = request.files.get('logo')
    if archivo_logo and archivo_logo.filename:
        try:
            mime_type = validar_archivo(archivo_logo.stream, TIPOS_IMAGEN, MAX_LOGO_PATROCINADOR)
        except ValueError as e:
            return api_error('INVALID_FILE', str(e), status=400)
            
        nueva_url_logo = subir_archivo(
            file_stream=archivo_logo.stream,
            nombre_original=archivo_logo.filename,
            carpeta='patrocinadores',
            mime_type=mime_type
        )
        
        url_antigua = patrocinador.url_logo_patrocinador
        patrocinador.url_logo_patrocinador = nueva_url_logo
        
        # Opcional: borrar el logo antiguo del S3 si se subió uno nuevo exitosamente
        if url_antigua:
            borrar_archivo(url_antigua)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return api_error('DB_ERROR', "Error al actualizar el patrocinador en la base de datos.", status=500)

    return api_response(
        message="Patrocinador actualizado exitosamente.",
        data=patrocinador_schema.dump(patrocinador)
    )


@patrocinador_bp.route('/<int:id_patrocinador>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin'])
def delete_patrocinador(id_patrocinador):
    """Elimina un patrocinador."""
    patrocinador = db.session.get(Patrocinador, id_patrocinador)
    if not patrocinador:
        return api_error('NOT_FOUND', "Patrocinador no encontrado.", status=404)
        
    url_logo = patrocinador.url_logo_patrocinador

    db.session.delete(patrocinador)
    try:
        db.session.commit()
        # Borrar el archivo del S3 solo si el borrado de la BD es exitoso
        if url_logo:
            borrar_archivo(url_logo)
    except Exception:
        db.session.rollback()
        return api_error('DB_ERROR', "Error al eliminar el patrocinador de la base de datos.", status=500)

    return api_response(message="Patrocinador eliminado exitosamente.")
