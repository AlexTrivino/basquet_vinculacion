import os
from app import create_app, db
from app.services.plantilla_service import crear_plantilla

app = create_app()

with app.app_context():
    try:
        crear_plantilla({
            'id_jugador': 1,
            'id_equipo': 1,
            'id_torneo': 1,
            'id_categoria': 1,
            'numero_camiseta': 10
        }, usuario_rol='delegado')
    except Exception as e:
        import traceback
        traceback.print_exc()
