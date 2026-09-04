"""add_anulado_to_partido_estado

Revision ID: 9882c7d1a9ac
Revises: 88b55e00cf32
Create Date: 2026-09-03 13:39:06.101648

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9882c7d1a9ac'
down_revision = '88b55e00cf32'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the old constraint
    op.drop_constraint('ck_partidos_estado', 'partidos', type_='check')
    
    # Add the new constraint with 'anulado'
    op.create_check_constraint(
        'ck_partidos_estado',
        'partidos',
        "estado IN ('programado', 'en_curso', 'finalizado', 'finalizado_wo', 'suspendido', 'anulado')"
    )


def downgrade():
    # Drop the new constraint
    op.drop_constraint('ck_partidos_estado', 'partidos', type_='check')
    
    # Revert to the old constraint
    op.create_check_constraint(
        'ck_partidos_estado',
        'partidos',
        "estado IN ('programado', 'en_curso', 'finalizado', 'finalizado_wo', 'suspendido')"
    )
