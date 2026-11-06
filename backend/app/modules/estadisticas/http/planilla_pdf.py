"""La Planilla Oficial FIBA de un partido en PDF (ReportLab, en memoria: ningún archivo toca el disco).

Movida de app/services/reportes_service.py; arma el documento con la planilla que entrega el caso de uso.
"""
from datetime import datetime
from io import BytesIO
from xml.sax.saxutils import escape  # Paragraph interpreta marcado: los textos de la base van escapados

# ── ReportLab — Platypus (tablas declarativas) ────────────────────
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Paleta de colores FIBA-inspired ──────────────────────────────
_AZUL_FIBA = colors.HexColor('#003DA5')
_AZUL_CLARO = colors.HexColor('#E8EEFA')
_GRIS_BORDE = colors.HexColor('#CCCCCC')
_ROJO_MARCADOR = colors.HexColor('#C8102E')
_BLANCO = colors.white
_NEGRO = colors.black


# ── Estilos tipográficos ──────────────────────────────────────────

def _estilos():
    """Retorna un dict de ParagraphStyles reutilizables."""
    base = getSampleStyleSheet()
    return {
        'titulo': ParagraphStyle(
            'titulo',
            parent=base['Title'],
            fontSize=16,
            textColor=_AZUL_FIBA,
            spaceAfter=4,
            fontName='Helvetica-Bold',
        ),
        'subtitulo': ParagraphStyle(
            'subtitulo',
            parent=base['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#555555'),
            spaceAfter=2,
            fontName='Helvetica',
        ),
        'marcador': ParagraphStyle(
            'marcador',
            parent=base['Normal'],
            fontSize=28,
            textColor=_ROJO_MARCADOR,
            spaceAfter=6,
            fontName='Helvetica-Bold',
            alignment=1,  # center
        ),
        'equipo_header': ParagraphStyle(
            'equipo_header',
            parent=base['Normal'],
            fontSize=11,
            textColor=_AZUL_FIBA,
            spaceBefore=10,
            spaceAfter=4,
            fontName='Helvetica-Bold',
        ),
        'footer': ParagraphStyle(
            'footer',
            parent=base['Normal'],
            fontSize=7,
            textColor=colors.HexColor('#999999'),
            alignment=1,
            fontName='Helvetica',
        ),
    }


# ── Estilo compartido para tablas de estadísticas ─────────────────

_ESTILO_TABLA = TableStyle([
    # Encabezado
    ('BACKGROUND',    (0, 0), (-1, 0),  _AZUL_FIBA),
    ('TEXTCOLOR',     (0, 0), (-1, 0),  _BLANCO),
    ('FONTNAME',      (0, 0), (-1, 0),  'Helvetica-Bold'),
    ('FONTSIZE',      (0, 0), (-1, 0),  9),
    ('ALIGN',         (0, 0), (-1, 0),  'CENTER'),
    ('BOTTOMPADDING', (0, 0), (-1, 0),  6),
    ('TOPPADDING',    (0, 0), (-1, 0),  6),
    # Filas de datos
    ('FONTNAME',      (0, 1), (-1, -1), 'Helvetica'),
    ('FONTSIZE',      (0, 1), (-1, -1), 8),
    ('ALIGN',         (2, 1), (-1, -1), 'CENTER'),  # columnas numéricas centradas
    ('ALIGN',         (0, 1), (1, -1),  'LEFT'),    # N° y nombre alineados a izquierda
    ('ROWBACKGROUNDS',(0, 1), (-1, -1), [_BLANCO, _AZUL_CLARO]),
    ('TOPPADDING',    (0, 1), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
    # Bordes
    ('GRID',          (0, 0), (-1, -1), 0.5, _GRIS_BORDE),
    ('BOX',           (0, 0), (-1, -1), 1,   _AZUL_FIBA),
    # Fila de totales (última)
    ('FONTNAME',      (0, -1), (-1, -1), 'Helvetica-Bold'),
    ('BACKGROUND',    (0, -1), (-1, -1), colors.HexColor('#F0F4FF')),
    ('LINEABOVE',     (0, -1), (-1, -1), 1,   _AZUL_FIBA),
])

_CABECERA_STATS = ['#', 'Jugador', 'PTS', '3PT', 'F', 'REB', 'AST']


def _tabla_equipo(lineas):
    """La tabla de un equipo: una fila por jugador y la de totales al final."""
    filas = [_CABECERA_STATS]
    totales = {'pts': 0, 'triples': 0, 'faltas': 0, 'rebotes': 0, 'asistencias': 0}
    for linea in lineas:
        filas.append([
            str(linea.dorsal),
            linea.nombre[:30],        # Truncar nombres muy largos
            str(linea.puntos),
            str(linea.triples),
            str(linea.faltas),
            str(linea.rebotes),
            str(linea.asistencias),
        ])
        totales['pts'] += linea.puntos
        totales['triples'] += linea.triples
        totales['faltas'] += linea.faltas
        totales['rebotes'] += linea.rebotes
        totales['asistencias'] += linea.asistencias

    # Fila de totales del equipo
    filas.append([
        '', 'TOTALES',
        str(totales['pts']),
        str(totales['triples']),
        str(totales['faltas']),
        str(totales['rebotes']),
        str(totales['asistencias']),
    ])

    # Anchos de columna: N°, Nombre, PTS, 3PT, F, REB, AST
    col_widths = [1.2*cm, 7.5*cm, 1.5*cm, 1.5*cm, 1.2*cm, 1.5*cm, 1.5*cm]

    tabla = Table(filas, colWidths=col_widths, repeatRows=1)
    tabla.setStyle(_ESTILO_TABLA)
    return tabla


def generar(planilla):
    """El PDF de la planilla (``BytesIO`` en el inicio, listo para ``send_file``)."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=1.5*cm,
        rightMargin=1.5*cm,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm,
        title=f'Planilla Partido {planilla.id_partido}',
        author='Torneos Baloncesto Manta',
    )

    estilos = _estilos()
    elementos = []

    # ── BLOQUE 1: Encabezado del documento ────────────────────────
    elementos.append(Paragraph(
        f'PLANILLA OFICIAL DE PARTIDO — {escape(planilla.torneo.upper())}',
        estilos['titulo'],
    ))
    fecha_str = planilla.fecha.strftime('%d de %B de %Y') if planilla.fecha else 'Sin fecha'
    hora_str = planilla.hora.strftime('%H:%M') if planilla.hora else ''
    elementos.append(Paragraph(
        f'Fase: {escape(str(planilla.fase))}  ·  Fecha: {fecha_str} {hora_str}  ·  '
        f'Ubicación: {escape(str(planilla.ubicacion))}',
        estilos['subtitulo'],
    ))
    elementos.append(Spacer(1, 0.3*cm))

    # ── BLOQUE 2: Marcador final ──────────────────────────────────
    nombre_local = escape(planilla.local.upper())
    nombre_visitante = escape(planilla.visitante.upper())
    elementos.append(Paragraph(
        f'{nombre_local}  {planilla.marcador_local} — {planilla.marcador_visitante}  {nombre_visitante}',
        estilos['marcador'],
    ))
    elementos.append(Spacer(1, 0.4*cm))

    # ── BLOQUES 3 y 4: Tabla de cada equipo ───────────────────────
    for nombre, lado, lineas in ((nombre_local, 'Local', planilla.lineas_local), (nombre_visitante, 'Visitante', planilla.lineas_visitante)):
        elementos.append(Paragraph(f'▶  {nombre}  ({lado})', estilos['equipo_header']))
        if lineas:
            elementos.append(_tabla_equipo(lineas))
        else:
            elementos.append(Paragraph('Sin estadísticas registradas para este equipo.', estilos['subtitulo']))
        elementos.append(Spacer(1, 0.5*cm if lado == 'Local' else 0.6*cm))

    # ── BLOQUE 5: Footer ──────────────────────────────────────────
    elementos.append(Paragraph(
        f'Documento generado automáticamente · Torneos Baloncesto Manta · '
        f'{datetime.now().strftime("%d/%m/%Y %H:%M")}',
        estilos['footer'],
    ))

    doc.build(elementos)
    buffer.seek(0)   # Reposicionar al inicio para Flask send_file
    return buffer
