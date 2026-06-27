"""
Blueprint de rutas para la generación de reportes PDF (Fase 8).

Ruta única delegadora:
    ``GET /api/reportes/partido/<id>/planilla``

La ruta llama al servicio, recibe el buffer en memoria y lo envía
al cliente con ``flask.send_file`` — ningún archivo toca el disco.
"""
from flask import Blueprint, send_file

from app.services import reportes_service
from app.utils.auth_middleware import token_required
from app.utils.response import api_error

reportes_bp = Blueprint('reportes', __name__, url_prefix='/api/reportes')


@reportes_bp.route('/partido/<int:id_partido>/planilla', methods=['GET'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def descargar_planilla(id_partido):
    """Genera y descarga la Planilla Oficial FIBA de un partido como PDF.

    El PDF se genera completamente en memoria (``BytesIO``) sin escribir
    ningún archivo temporal al disco del servidor.

    Requiere que el partido esté en estado ``'finalizado'`` o
    ``'finalizado_wo'`` para tener estadísticas definitivas.

    Returns:
        Archivo PDF como attachment con nombre ``planilla_partido_{id}.pdf``.
    """
    try:
        buffer = reportes_service.generar_planilla_partido(id_partido)
    except ValueError as e:
        return api_error('VALIDATION_ERROR', str(e), 422)

    return send_file(
        buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'planilla_partido_{id_partido}.pdf',
    )
