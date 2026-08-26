"""
Blueprint de rutas para el ingreso masivo de estadísticas (Fase 7).

Ruta única delegadora (ruta delgada):
    ``POST /api/estadisticas/bulk``

La ruta valida el payload con Marshmallow y delega 100% la lógica
a ``stats_service.procesar_estadisticas_bulk()``.
"""
from flask import Blueprint, g, request
from marshmallow import ValidationError

from app.schemas.stats_schema import EstadisticasBulkSchema
from app.services import stats_service
from app.utils.auth_middleware import token_required
from app.utils.response import api_error, api_response

stats_bp = Blueprint('estadisticas', __name__, url_prefix='/api/estadisticas')

_bulk_schema = EstadisticasBulkSchema()

@stats_bp.route('/dashboard', methods=['GET'])
@token_required(allowed_roles=['super_admin'])
def dashboard_stats():
    """Retorna los contadores para el Dashboard del Admin."""
    from app.models import Inscripcion, Partido, Equipo
    from sqlalchemy import or_
    
    # 1. Inscripciones pendientes
    inscripciones_pendientes = Inscripcion.query.filter_by(estado_inscripcion='pendiente').count()
    
    # 2. Partidos activos/hoy
    partidos_hoy = Partido.query.filter_by(estado='programado').count()
    
    # 3. Equipos inscritos
    equipos_totales = Equipo.query.count()
    
    # 4. Partidos sin estadísticas
    partidos_sin_estadisticas = Partido.query.filter(
        Partido.estado == 'finalizado',
        or_(Partido.stats_local_procesadas == False, Partido.stats_visitante_procesadas == False)
    ).count()
    
    return api_response({
        'inscripciones_pendientes': inscripciones_pendientes,
        'partidos_hoy': partidos_hoy,
        'equipos_totales': equipos_totales,
        'partidos_sin_estadisticas': partidos_sin_estadisticas
    })


@stats_bp.route('/dashboard/actividad-reciente', methods=['GET'])
@token_required(allowed_roles=['super_admin'])
def actividad_reciente():
    """Retorna los últimos eventos relevantes en el sistema."""
    from app.models import Inscripcion, Partido
    
    # Obtener últimas inscripciones
    ultimas_inscripciones = Inscripcion.query.order_by(Inscripcion.updated_at.desc()).limit(5).all()
    
    # Obtener últimos partidos finalizados
    ultimos_partidos = Partido.query.filter_by(estado='finalizado').order_by(Partido.updated_at.desc()).limit(5).all()
    
    eventos = []
    
    for insc in ultimas_inscripciones:
        eventos.append({
            'tipo': 'inscripcion',
            'titulo': f'Inscripción {insc.estado_inscripcion.upper()}',
            'descripcion': f'Equipo ID {insc.id_equipo} en Torneo ID {insc.id_torneo}',
            'fecha': insc.updated_at.isoformat() if insc.updated_at else None,
            'estado': insc.estado_inscripcion
        })
        
    for part in ultimos_partidos:
        eventos.append({
            'tipo': 'partido',
            'titulo': f'Partido Finalizado',
            'descripcion': f'{part.marcador_local} - {part.marcador_visitante}',
            'fecha': part.updated_at.isoformat() if part.updated_at else None,
            'estado': part.estado
        })
        
    # Ordenar por fecha descendente y tomar los top 8
    eventos.sort(key=lambda x: x['fecha'] or '', reverse=True)
    eventos = eventos[:8]
    
    return api_response(eventos)



@stats_bp.route('/bulk', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def ingresar_estadisticas_bulk():
    """Ingresa las estadísticas de todos los jugadores de un equipo en un partido.

    Acepta un Bulk DTO con el partido, el equipo y un array de estadísticas
    individuales. Opcionalmente registra sanciones en la misma transacción.

    Garantías de seguridad:
        - Verifica que el partido existe y está activo.
        - Verifica que el equipo participó en el partido.
        - Anti-spoofing: valida que todos los IDs de jugadores pertenecen
          al equipo en la plantilla activa (set difference con una sola query).
        - Para delegados: verifica propiedad del equipo via ``g.usuario_id``.

    Responde con el número de estadísticas y sanciones insertadas.
    """
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)

    try:
        data = _bulk_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)

    try:
        resultado = stats_service.procesar_estadisticas_bulk(
            data=data,
            usuario_id=g.usuario_id,
            usuario_rol=g.usuario_rol,
        )
    except ValueError as e:
        mensaje = str(e)
        # Spoofing de jugadores rivales → 403 Forbidden
        # Resto de errores de negocio → 422
        es_spoofing = 'jugadores rivales' in mensaje or 'no pertenecen' in mensaje
        return api_error(
            'FORBIDDEN' if es_spoofing else 'VALIDATION_ERROR',
            mensaje,
            403 if es_spoofing else 422,
        )

    return api_response(
        data=resultado,
        message=(
            f"{resultado['estadisticas_insertadas']} estadísticas "
            f"y {resultado['sanciones_insertadas']} sanción(es) registradas exitosamente."
        ),
        status=201,
    )
