"""Agregar estado finalizado_wo al CheckConstraint de partidos.

Revision ID: a1b2c3d4e5f6
Revises: cc4d951950ca
Create Date: 2026-06-20 02:11:00.000000

Alembic no detecta cambios en CheckConstraints automáticamente.
Esta migración manual:
    1. Elimina el constraint existente ``ck_partidos_estado``.
    2. Recrea el constraint incluyendo ``'finalizado_wo'``.
"""
from alembic import op

# ── Identificadores de revisión ───────────────────────────────────
revision = 'a1b2c3d4e5f6'
down_revision = 'cc4d951950ca'
branch_labels = None
depends_on = None


def upgrade():
    """Reemplaza el CheckConstraint de estados de partidos.

    Estrategia DROP → ADD porque PostgreSQL no permite ALTER en constraints.
    La operación es transaccional: si el ADD falla, el DROP se revierte.
    """
    # Eliminar el constraint existente (solo reconoce 4 estados)
    op.drop_constraint(
        'ck_partidos_estado',
        'partidos',
        type_='check',
    )

    # Recrear el constraint con los 5 estados válidos
    op.create_check_constraint(
        'ck_partidos_estado',
        'partidos',
        "estado IN ('programado', 'en_curso', 'finalizado', 'finalizado_wo', 'suspendido')",
    )


def downgrade():
    """Revierte al constraint original sin 'finalizado_wo'.

    Nota: Si existen filas con estado='finalizado_wo' en la BD,
    este downgrade fallará con un CheckViolation.
    Actualice manualmente esas filas antes de hacer downgrade.
    """
    op.drop_constraint(
        'ck_partidos_estado',
        'partidos',
        type_='check',
    )

    op.create_check_constraint(
        'ck_partidos_estado',
        'partidos',
        "estado IN ('programado', 'en_curso', 'finalizado', 'suspendido')",
    )
