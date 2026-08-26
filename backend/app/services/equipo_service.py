"""
Servicio de lógica de negocio para la entidad Equipo (Decisión #10).

Reglas de negocio implementadas:
    - Un delegado solo puede registrar equipos a su nombre (via g.usuario_id).
    - Un delegado solo puede editar/eliminar sus propios equipos.
    - Un super_admin puede operar sobre cualquier equipo.
    - El borrado es siempre lógico (soft delete: estado='inactivo').
"""
from flask import g
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.equipo import Equipo
from app.utils.text_utils import normalizar_mayusculas


def listar_equipos_activos():
    """Retorna la query base de equipos activos para paginación.

    Usa ``Equipo.activos()`` para excluir registros eliminados lógicamente.
    Ordena alfabéticamente por nombre.

    Returns:
        Query de SQLAlchemy sin ejecutar, lista para ``paginate_query()``.
    """
    return Equipo.activos().order_by(Equipo.nombre_equipo)


def obtener_equipo_por_id(id_equipo, incluir_inactivos=False):
    """Obtiene un equipo por su ID.

    Args:
        id_equipo: Identificador del equipo.
        incluir_inactivos: Si ``True``, retorna también equipos inactivos.

    Returns:
        Instancia de ``Equipo`` o ``None`` si no existe o fue eliminado.
    """
    equipo = db.session.get(Equipo, id_equipo)

    if equipo is None:
        return None

    if not incluir_inactivos and equipo.estado == 'inactivo':
        return None

    return equipo


def crear_equipo(data):
    """Crea un nuevo equipo asignado al usuario autenticado.

    El ``id_usuario`` se extrae de ``flask.g`` (inyectado por el middleware
    JWT) — nunca del payload del cliente.

    Args:
        data: Dict validado por ``EquipoCreateSchema``.

    Returns:
        Instancia de ``Equipo`` recién creada.

    Raises:
        ValueError: Si ya existe un equipo con el mismo nombre exacto.
    """
    from app.models.inscripcion import Inscripcion
    
    data = normalizar_mayusculas(data, ['nombre_equipo'])
    data['id_usuario'] = g.usuario_id

    from app.utils.business_rules import MAX_EQUIPOS_POR_DELEGADO
    
    # ── Validación de Límite de Equipos ───────────────────────────
    equipos_activos = Equipo.query.filter_by(id_usuario=g.usuario_id, estado='activo').count()
    if equipos_activos >= MAX_EQUIPOS_POR_DELEGADO:
        raise ValueError(f'Límite alcanzado: Un delegado solo puede administrar {MAX_EQUIPOS_POR_DELEGADO} equipo(s).')

    try:
        equipo = Equipo(**data)
        db.session.add(equipo)
        db.session.commit()
        return equipo
    except IntegrityError:
        db.session.rollback()
        raise ValueError('Ya existe un equipo con ese nombre para este delegado.')


def actualizar_equipo(equipo, data, verificar_propietario=True):
    """Actualiza los campos de un equipo existente.

    Args:
        equipo: Instancia de ``Equipo`` a actualizar.
        data: Dict validado por ``EquipoUpdateSchema``.
        verificar_propietario: Si ``True``, verifica que ``g.usuario_id``
            sea el propietario del equipo. Los super_admin pasan ``False``.

    Returns:
        Instancia de ``Equipo`` actualizada.
        
    Raises:
        ValueError: Si el nuevo nombre colisiona con otro equipo existente.
    """
    data = normalizar_mayusculas(data, ['nombre_equipo'])
    
    if verificar_propietario and equipo.id_usuario != g.usuario_id:
        raise PermissionError(
            'No tienes permiso para modificar este equipo.'
        )

    for key, value in data.items():
        setattr(equipo, key, value)

    db.session.commit()
    return equipo


def eliminar_equipo(id_equipo, verificar_propietario=True):
    """Soft delete: marca el equipo como inactivo.

    Args:
        id_equipo: Identificador del equipo a eliminar.
        verificar_propietario: Si ``True``, verifica propiedad del delegado.

    Returns:
        Instancia de ``Equipo`` desactivada, o ``None`` si no existe.

    Raises:
        PermissionError: Si el delegado intenta eliminar un equipo ajeno.
    """
    equipo = db.session.get(Equipo, id_equipo)

    if equipo is None or equipo.estado == 'inactivo':
        return None

    if verificar_propietario and equipo.id_usuario != g.usuario_id:
        raise PermissionError(
            'No tienes permiso para eliminar este equipo.'
        )

    equipo.estado = 'inactivo'
    db.session.commit()
    return equipo

def reactivar_equipo(id_equipo):
    equipo = db.session.get(Equipo, id_equipo)
    if not equipo or equipo.estado == 'activo': return None

    # Validar límite de 1 equipo activo para el delegado
    equipos_activos = Equipo.query.filter_by(
        id_usuario=equipo.id_usuario, estado='activo'
    ).count()

    if equipos_activos >= 1:
        raise ValueError('Este delegado ya tiene 1 equipo activo.')

    equipo.estado = 'activo'
    db.session.commit()
    return equipo

def listar_equipos_admin(id_torneo=None, id_categoria=None, search_query=None, estado=None):
    from sqlalchemy.orm import joinedload
    from app.models.inscripcion import Inscripcion
    
    query = Equipo.query.options(
        joinedload(Equipo.usuario),
        joinedload(Equipo.inscripciones).joinedload(Inscripcion.torneo),
        joinedload(Equipo.inscripciones).joinedload(Inscripcion.categoria)
    ).order_by(Equipo.nombre_equipo)
    
    if search_query:
        query = query.filter(Equipo.nombre_equipo.ilike(f'%{search_query}%'))
        
    if estado:
        query = query.filter(Equipo.estado == estado)
        
    if id_torneo or id_categoria:
        query = query.join(Inscripcion, Equipo.id_equipo == Inscripcion.id_equipo)
        if id_torneo: query = query.filter(Inscripcion.id_torneo == id_torneo)
        if id_categoria: query = query.filter(Inscripcion.id_categoria == id_categoria)
    return query
