"""fotos_podio

Revision ID: f4c1d2e3a5b6
Revises: e7a1b5c3d9f2
Create Date: 2026-11-16 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4c1d2e3a5b6'
down_revision = 'e7a1b5c3d9f2'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    # La tabla puede existir ya: producción la pudo crear a mano con la query de specs/14-foto-podio-flyer/plan.md.
    # En ese caso la migración solo anota la versión (y repite el ENABLE ROW LEVEL SECURITY, que no hace daño).
    if not sa.inspect(bind).has_table('fotos_podio'):
        op.create_table(
            'fotos_podio',
            sa.Column('id_foto_podio', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('id_categoria', sa.Integer(), nullable=False),
            sa.Column('id_equipo', sa.Integer(), nullable=False),
            sa.Column('url_foto', sa.Text(), nullable=False),
            sa.Column('ancho', sa.Integer(), nullable=False),
            sa.Column('alto', sa.Integer(), nullable=False),
            sa.Column('foco_x', sa.Numeric(5, 2), server_default=sa.text('50'), nullable=False),
            sa.Column('foco_y', sa.Numeric(5, 2), server_default=sa.text('50'), nullable=False),
            sa.Column('zoom', sa.Numeric(3, 2), server_default=sa.text('1'), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.CheckConstraint('ancho > 0', name='ck_fotos_podio_ancho'),
            sa.CheckConstraint('alto > 0', name='ck_fotos_podio_alto'),
            sa.CheckConstraint('foco_x BETWEEN 0 AND 100', name='ck_fotos_podio_foco_x'),
            sa.CheckConstraint('foco_y BETWEEN 0 AND 100', name='ck_fotos_podio_foco_y'),
            sa.CheckConstraint('zoom BETWEEN 1 AND 3', name='ck_fotos_podio_zoom'),
            sa.ForeignKeyConstraint(['id_categoria'], ['categorias.id_categoria'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['id_equipo'], ['equipos.id_equipo'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id_foto_podio'),
            sa.UniqueConstraint('id_categoria', 'id_equipo', name='uq_fotos_podio_categoria_equipo'),
        )
    if bind.dialect.name == 'postgresql':
        # Como el resto de las tablas de public: sin políticas, la API REST de Supabase con la llave anon no la lee;
        # el backend, que es el dueño, sí
        op.execute('ALTER TABLE fotos_podio ENABLE ROW LEVEL SECURITY')


def downgrade():
    op.drop_table('fotos_podio')
