"""
Servicio de lógica de negocio para la entidad Torneo (Decisión #10).

Encapsula todas las operaciones CRUD y reglas de negocio,
manteniendo las rutas como delegadores puros.
"""
from app import db
from app.models.torneo import Torneo


def crear_torneo(data):
    """Crea un nuevo torneo en la base de datos.

    Args:
        data: Dict validado por ``TorneoCreateSchema``.

    Returns:
        Instancia de ``Torneo`` recién creada.
    """
    torneo = Torneo(**data)
    db.session.add(torneo)
    db.session.commit()
    return torneo


def listar_torneos_activos():
    """Retorna la query base de torneos activos para paginación.

    Usa el scope ``Torneo.activos()`` para excluir registros
    eliminados lógicamente. Ordena por fecha de inicio descendente
    (torneos más recientes primero).

    Returns:
        Query de SQLAlchemy sin ejecutar, lista para ``paginate_query()``.
    """
    return Torneo.activos().order_by(Torneo.fecha_inicio.desc())


def obtener_torneo_por_id(id_torneo, incluir_inactivos=False):
    """Obtiene un torneo por su ID.

    Args:
        id_torneo: Identificador del torneo.
        incluir_inactivos: Si ``True``, retorna incluso torneos
            marcados como inactivos (soft delete). Útil para
            operaciones administrativas internas.

    Returns:
        Instancia de ``Torneo`` o ``None`` si no existe o fue eliminado.
    """
    torneo = db.session.get(Torneo, id_torneo)

    if torneo is None:
        return None

    if not incluir_inactivos and torneo.estado == 'inactivo':
        return None

    return torneo


def actualizar_torneo(torneo, data):
    """Actualiza los campos de un torneo existente.

    Valida la coherencia de fechas contra los valores existentes
    cuando solo se actualiza una de las dos fechas (validación
    cruzada que el schema no puede hacer por sí solo).

    Args:
        torneo: Instancia de ``Torneo`` existente.
        data: Dict validado por ``TorneoUpdateSchema``.

    Returns:
        Instancia de ``Torneo`` actualizada.

    Raises:
        ValueError: Si la combinación de fechas resultante es inválida.
    """
    fecha_inicio = data.get('fecha_inicio', torneo.fecha_inicio)
    fecha_fin = data.get('fecha_fin', torneo.fecha_fin)

    if fecha_fin < fecha_inicio:
        raise ValueError(
            'La fecha de fin debe ser igual o posterior a la fecha de inicio.'
        )

    for key, value in data.items():
        setattr(torneo, key, value)

    db.session.commit()
    return torneo


def eliminar_torneo(id_torneo):
    """Soft delete: marca el torneo como inactivo.

    No elimina físicamente el registro. Cambia ``estado`` a
    ``'inactivo'`` para que ``Torneo.activos()`` lo excluya
    de todas las consultas futuras.

    Args:
        id_torneo: Identificador del torneo a eliminar.

    Returns:
        Instancia de ``Torneo`` desactivada, o ``None`` si no existe
        o ya estaba inactivo.
    """
    torneo = db.session.get(Torneo, id_torneo)

    if torneo is None or torneo.estado == 'inactivo':
        return None

    torneo.estado = 'inactivo'
    db.session.commit()
    return torneo
