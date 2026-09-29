"""add_visor_to_usuario_rol

Revision ID: b3f1c7a9d2e4
Revises: 9882c7d1a9ac
Create Date: 2026-09-29 12:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'b3f1c7a9d2e4'
down_revision = '9882c7d1a9ac'
branch_labels = None
depends_on = None


def upgrade():
    # Solo amplía los valores permitidos: no toca filas existentes
    op.drop_constraint('ck_usuarios_rol', 'usuarios', type_='check')
    op.create_check_constraint(
        'ck_usuarios_rol',
        'usuarios',
        "rol IN ('super_admin', 'delegado', 'visor')"
    )


def downgrade():
    # Los visores quedan como delegados INACTIVOS: la restricción vieja no admite 'visor'
    # y no deben ganar permisos de delegado al revertir
    op.execute("UPDATE usuarios SET rol = 'delegado', estado = 'inactivo' WHERE rol = 'visor'")
    op.drop_constraint('ck_usuarios_rol', 'usuarios', type_='check')
    op.create_check_constraint(
        'ck_usuarios_rol',
        'usuarios',
        "rol IN ('super_admin', 'delegado')"
    )
