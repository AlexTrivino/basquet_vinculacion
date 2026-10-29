"""Ruta de la planilla oficial de un partido en PDF: /api/reportes/partido/<id>/planilla. El PDF se arma en memoria."""
from flask import Blueprint, send_file

from app.modules.estadisticas.application import estadisticas as casos
from app.modules.estadisticas.http import planilla_pdf
from app.modules.estadisticas.infrastructure.repositorio import RepositorioEstadisticas
from app.shared.domain.errores import ErrorDeDominio
from app.shared.http.autenticacion import token_required
from app.shared.http.respuestas import api_error

reportes_bp = Blueprint('reportes', __name__, url_prefix='/api/reportes')


@reportes_bp.route('/partido/<int:id_partido>/planilla', methods=['GET'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def descargar_planilla(id_partido):
    """La planilla de un partido finalizado (o por W.O.), como ``planilla_partido_<id>.pdf``."""
    try:
        buffer = planilla_pdf.generar(casos.planilla(id_partido, RepositorioEstadisticas()))
    except (ErrorDeDominio, ValueError) as e:  # como siempre: el partido que no existe o no terminó es 422
        return api_error('VALIDATION_ERROR', str(e), 422)
    return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name=f'planilla_partido_{id_partido}.pdf')
