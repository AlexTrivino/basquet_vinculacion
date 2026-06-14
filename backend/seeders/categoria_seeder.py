"""
Seeder de Categorías — datos estáticos iniciales del sistema.

Ejecutar desde el directorio ``backend/`` con el entorno virtual activo::

    python seeders/categoria_seeder.py

El script es idempotente: verifica la existencia de cada categoría
por nombre + género antes de insertar, evitando duplicados en
ejecuciones repetidas.
"""
import os
import sys

# Agregar el directorio raíz al path para importar la app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.categoria import Categoria

# ── Definición de categorías del torneo ──────────────────────────
#
# Categorías validadas con el comité organizador de
# Exalumnos Salesianos de Manta:
#   - Juvenil: menores de 18 años
#   - Abierta: sin límite de edad
#   - +30, +40, +50: mayores de la edad indicada
#
CATEGORIAS = [
    # ── Masculino ─────────────────────────────────────────────────
    {
        'nombre_categoria': 'Juvenil Masculino',
        'genero_categoria': 'masculino',
        'edad_minima': 14,
        'edad_maxima': 17,
    },
    {
        'nombre_categoria': 'Abierta Masculino',
        'genero_categoria': 'masculino',
        'edad_minima': 18,
        'edad_maxima': None,
    },
    {
        'nombre_categoria': 'Máster +30 Masculino',
        'genero_categoria': 'masculino',
        'edad_minima': 30,
        'edad_maxima': None,
    },
    {
        'nombre_categoria': 'Máster +40 Masculino',
        'genero_categoria': 'masculino',
        'edad_minima': 40,
        'edad_maxima': None,
    },
    {
        'nombre_categoria': 'Máster +50 Masculino',
        'genero_categoria': 'masculino',
        'edad_minima': 50,
        'edad_maxima': None,
    },
    # ── Femenino ──────────────────────────────────────────────────
    {
        'nombre_categoria': 'Juvenil Femenino',
        'genero_categoria': 'femenino',
        'edad_minima': 14,
        'edad_maxima': 17,
    },
    {
        'nombre_categoria': 'Abierta Femenino',
        'genero_categoria': 'femenino',
        'edad_minima': 18,
        'edad_maxima': None,
    },
    {
        'nombre_categoria': 'Máster +30 Femenino',
        'genero_categoria': 'femenino',
        'edad_minima': 30,
        'edad_maxima': None,
    },
    {
        'nombre_categoria': 'Máster +40 Femenino',
        'genero_categoria': 'femenino',
        'edad_minima': 40,
        'edad_maxima': None,
    },
]


def run():
    """Inserta las categorías iniciales en la base de datos.

    Idempotente: omite silenciosamente categorías ya existentes
    (matching por nombre + género).
    """
    app = create_app()

    with app.app_context():
        insertadas = 0
        omitidas = 0

        for datos in CATEGORIAS:
            existe = Categoria.query.filter_by(
                nombre_categoria=datos['nombre_categoria'],
                genero_categoria=datos['genero_categoria'],
            ).first()

            if existe:
                print(f'  [OMITIDA]   {datos["nombre_categoria"]}')
                omitidas += 1
                continue

            categoria = Categoria(**datos)
            db.session.add(categoria)
            print(f'  [INSERTADA] {datos["nombre_categoria"]}')
            insertadas += 1

        db.session.commit()
        print(
            f'\nSeeder completado: {insertadas} insertada(s), '
            f'{omitidas} omitida(s).'
        )


if __name__ == '__main__':
    run()
