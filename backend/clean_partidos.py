import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app

from app.shared.infrastructure.db import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print(f"Base: {db.engine.url.render_as_string(hide_password=True)}")
    if not sys.stdin.isatty() or input("Se borran TODOS los partidos y estadísticas. Escribe 'BORRAR PARTIDOS': ").strip() != 'BORRAR PARTIDOS':
        sys.exit("Operación cancelada.")
    db.session.execute(text('TRUNCATE TABLE estadisticas CASCADE;'))
    db.session.execute(text('TRUNCATE TABLE partidos CASCADE;'))
    db.session.commit()
    print("Tablas estadisticas y partidos vaciadas con éxito.")
