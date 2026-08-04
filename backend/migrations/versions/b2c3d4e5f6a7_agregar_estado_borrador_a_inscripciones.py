"""Agregar estado borrador al CheckConstraint de inscripciones.

Revision ID: b2c3d4e5f6a7
Revises: fa545a025869
Create Date: 2026-08-04 13:20:00.000000

Alembic no detecta cambios en CheckConstraints automáticamente.
Esta migración:
    1. Elimina el constraint existente `ck_inscripciones_estado`.
    2. Recrea el constraint incluyendo `'borrador'`.
"""
from alembic import op

# ── Identificadores de revisión ───────────────────────────────────
revision = 'b2c3d4e5f6a7'
down_revision = 'fa545a025869'
branch_labels = None
depends_on = None


def upgrade():
    """Reemplaza el CheckConstraint de estados de inscripciones."""
    op.drop_constraint(
        'ck_inscripciones_estado',
        'inscripciones',
        type_='check',
    )
    op.create_check_constraint(
        'ck_inscripciones_estado',
        'inscripciones',
        "estado_inscripcion IN ('borrador', 'pendiente', 'aprobado', 'rechazado')",
    )


def downgrade():
    """Revierte al constraint original sin 'borrador'."""
    op.drop_constraint(
        'ck_inscripciones_estado',
        'inscripciones',
        type_='check',
    )
    op.create_check_constraint(
        'ck_inscripciones_estado',
        'inscripciones',
        "estado_inscripcion IN ('pendiente', 'aprobado', 'rechazado')",
    )
