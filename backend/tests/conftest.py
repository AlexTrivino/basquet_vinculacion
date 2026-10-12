"""Las pruebas corren siempre sobre SQLite en memoria, nunca sobre la base del .env.

DATABASE_URL se fija antes de importar la app (load_dotenv no pisa variables ya
definidas) y cada create_app() de las pruebas sale con las tablas creadas.
"""
import os

os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ.setdefault('SUPABASE_JWT_SECRET', 'secreto-de-prueba')
os.environ.setdefault('SUPABASE_URL', 'http://127.0.0.1:9')

import app as paquete  # noqa: E402
from app import db  # noqa: E402

_create_app = paquete.create_app


def _create_app_con_tablas():
    aplicacion = _create_app()
    with aplicacion.app_context():
        db.create_all()
    return aplicacion


paquete.create_app = _create_app_con_tablas
