"""fase_final_formato_y_llave

Revision ID: e7a1b5c3d9f2
Revises: b3f1c7a9d2e4
Create Date: 2026-10-11 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e7a1b5c3d9f2'
down_revision = 'b3f1c7a9d2e4'
branch_labels = None
depends_on = None


def upgrade():
    # Formato de la fase final de cada categoría (dos_grupos_cruces, un_grupo_semis, tres_final_directa).
    # Nulo = sin fase final configurada; no toca filas existentes.
    op.add_column('categorias', sa.Column('formato', sa.String(length=30), nullable=True))
    # Código de la llave de los partidos de fase final (CF1, SF2, 3P, F, R). Nulo = fase de grupos.
    op.add_column('partidos', sa.Column('llave', sa.String(length=10), nullable=True))


def downgrade():
    op.drop_column('partidos', 'llave')
    op.drop_column('categorias', 'formato')
