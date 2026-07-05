from app import db
from app.models.sancion import Sancion

def listar_sanciones(id_jugador=None, estado=None):
    query = Sancion.query.order_by(Sancion.fecha.desc())
    if id_jugador:
        query = query.filter_by(id_jugador=id_jugador)
    if estado:
        query = query.filter_by(estado=estado)
    return query

def crear_sancion(data):
    nueva_sancion = Sancion(
        motivo=data['motivo'],
        fecha=data['fecha'],
        id_jugador=data['id_jugador'],
        id_partido=data['id_partido']
    )
    db.session.add(nueva_sancion)
    db.session.commit()
    return nueva_sancion

def actualizar_sancion(id_sancion, motivo=None, estado=None):
    sancion = Sancion.query.get_or_404(id_sancion)
    if motivo: sancion.motivo = motivo
    if estado: sancion.estado = estado
    db.session.commit()
    return sancion
