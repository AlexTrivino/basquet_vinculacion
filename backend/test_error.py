import os
from app import create_app
from app.shared.infrastructure.db import db
from datetime import date

from app.modules.inscripciones.application.plantillas import agregar_jugador
from app.modules.inscripciones.infrastructure.repositorio import RepositorioPlantillas
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

app = create_app()

with app.app_context():
    try:
        repositorio = RepositorioPlantillas()
        agregar_jugador({
            'id_jugador': 1,
            'id_equipo': 1,
            'id_torneo': 1,
            'id_categoria': 1,
            'numero_camiseta': 10
        }, repositorio.dueno_del_equipo(1), 'delegado', date.today(), repositorio=repositorio, unidad=UnidadDeTrabajo())
    except Exception as e:
        import traceback
        traceback.print_exc()
