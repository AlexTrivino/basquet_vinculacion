"""premios_final

Revision ID: b8d2e4f6a1c3
Revises: f4c1d2e3a5b6
Create Date: 2026-11-18 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b8d2e4f6a1c3'
down_revision = 'f4c1d2e3a5b6'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    # La tabla puede existir ya: producción la pudo crear a mano con la query de specs/15-premios-de-la-final/plan.md.
    # En ese caso la migración solo anota la versión (y repite el ENABLE ROW LEVEL SECURITY, que no hace daño).
    if not sa.inspect(bind).has_table('premios_final'):
        op.create_table(
            'premios_final',
            sa.Column('id_premio_final', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('id_categoria', sa.Integer(), nullable=False),
            sa.Column('tipo', sa.String(length=10), nullable=False),
            sa.Column('id_jugador', sa.Integer(), nullable=False),
            sa.Column('url_foto', sa.Text(), nullable=True),
            sa.Column('ancho', sa.Integer(), nullable=True),
            sa.Column('alto', sa.Integer(), nullable=True),
            sa.Column('foco_x', sa.Numeric(5, 2), server_default=sa.text('50'), nullable=False),
            sa.Column('foco_y', sa.Numeric(5, 2), server_default=sa.text('50'), nullable=False),
            sa.Column('zoom', sa.Numeric(3, 2), server_default=sa.text('1'), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.CheckConstraint("tipo IN ('mvp', 'defensa')", name='ck_premios_final_tipo'),
            sa.CheckConstraint(
                '(url_foto IS NULL AND ancho IS NULL AND alto IS NULL) OR (url_foto IS NOT NULL AND COALESCE(ancho, 0) > 0 AND COALESCE(alto, 0) > 0)',
                name='ck_premios_final_foto'),
            sa.CheckConstraint('foco_x BETWEEN 0 AND 100', name='ck_premios_final_foco_x'),
            sa.CheckConstraint('foco_y BETWEEN 0 AND 100', name='ck_premios_final_foco_y'),
            sa.CheckConstraint('zoom BETWEEN 1 AND 3', name='ck_premios_final_zoom'),
            sa.ForeignKeyConstraint(['id_categoria'], ['categorias.id_categoria'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['id_jugador'], ['jugadores.id_jugador'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id_premio_final'),
            sa.UniqueConstraint('id_categoria', 'tipo', name='uq_premios_final_categoria_tipo'),
        )
    if bind.dialect.name == 'postgresql':
        # Como el resto de las tablas de public: sin políticas, la API REST de Supabase con la llave anon no la lee;
        # el backend, que es el dueño, sí
        op.execute('ALTER TABLE premios_final ENABLE ROW LEVEL SECURITY')


def downgrade():
    op.drop_table('premios_final')
