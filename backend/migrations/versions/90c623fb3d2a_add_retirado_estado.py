"""add_retirado_estado

Revision ID: 90c623fb3d2a
Revises: 1959686d785b
Create Date: 2026-08-22 21:36:32.201261

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '90c623fb3d2a'
down_revision = '1959686d785b'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('ck_inscripciones_estado', 'inscripciones', type_='check')
    op.create_check_constraint(
        'ck_inscripciones_estado',
        'inscripciones',
        "estado_inscripcion IN ('borrador', 'pendiente', 'aprobado', 'rechazado', 'retirado')"
    )


def downgrade():
    op.drop_constraint('ck_inscripciones_estado', 'inscripciones', type_='check')
    op.create_check_constraint(
        'ck_inscripciones_estado',
        'inscripciones',
        "estado_inscripcion IN ('borrador', 'pendiente', 'aprobado', 'rechazado')"
    )
