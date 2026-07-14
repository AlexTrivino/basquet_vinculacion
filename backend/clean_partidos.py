import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    db.session.execute(text('TRUNCATE TABLE estadisticas CASCADE;'))
    db.session.execute(text('TRUNCATE TABLE partidos CASCADE;'))
    db.session.commit()
    print("Tablas estadisticas y partidos vaciadas con éxito.")
