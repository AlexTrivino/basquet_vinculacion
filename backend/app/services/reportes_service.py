"""
Servicio de generación de reportes PDF (Fase 8).

Genera la Planilla Oficial FIBA de un partido en memoria (BytesIO),
sin escribir ningún archivo al disco del servidor.

Eficiencia de consultas:
    - Query 1: Partido con ``joinedload`` para torneo, equipos local/visitante
      y ``selectinload`` para la colección de estadísticas + jugadores.
      ``selectinload`` se prefiere sobre ``joinedload`` en colecciones 1:N
      porque evita el producto cartesiano (múltiples filas por partido).
    - Query 2: Una sola consulta ``in_`` a Plantillas para construir el
      mapa ``{id_jugador → id_equipo}`` y separar stats local/visitante
      en Python sin queries adicionales.

Total: 2 queries SQL → cero N+1 → buffer PDF en memoria → cliente.
"""
from io import BytesIO

from sqlalchemy.orm import joinedload, selectinload

from app import db
from app.models.estadistica import Estadistica
from app.models.partido import Partido
from app.models.plantilla import Plantilla

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


def _tabla_equipo(estadisticas: list, numero_camiseta_map: dict) -> Table:
    """Construye el objeto Table de Platypus para un equipo.

    Args:
        estadisticas: Lista de objetos ``Estadistica`` ya filtrados por equipo.
        numero_camiseta_map: Dict ``{id_jugador: numero_camiseta}`` de plantilla.

    Returns:
        ``Table`` de Platypus lista para agregar al documento.
    """
    filas = [_CABECERA_STATS]

    totales = {'pts': 0, 'triples': 0, 'faltas': 0, 'rebotes': 0, 'asistencias': 0}

    for e in estadisticas:
        camiseta = numero_camiseta_map.get(e.id_jugador, '-')
        nombre = e.jugador.nombre
        filas.append([
            str(camiseta),
            nombre[:30],              # Truncar nombres muy largos
            str(e.puntos_anotados),
            str(e.triples_anotados),
            str(e.faltas_cometidas),
            str(e.rebotes),
            str(e.asistencias),
        ])
        totales['pts']        += e.puntos_anotados
        totales['triples']    += e.triples_anotados
        totales['faltas']     += e.faltas_cometidas
        totales['rebotes']    += e.rebotes
        totales['asistencias'] += e.asistencias

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


# ── Función principal del servicio ────────────────────────────────

def generar_planilla_partido(id_partido: int) -> BytesIO:
    """Genera la Planilla Oficial FIBA de un partido como PDF en memoria.

    Consultas SQL emitidas:
        1. ``SELECT partidos JOIN torneos JOIN equipos (x2)``
           con ``selectinload(estadisticas → jugador)``.
           Trae partido, torneo, ambos equipos y todas las estadísticas
           con nombre del jugador en 2 SELECTs (no N+1).
        2. ``SELECT plantillas WHERE id_equipo IN (...) AND id_torneo = ?``
           para construir el mapa ``{id_jugador: numero_camiseta}``.

    Args:
        id_partido: ID del partido a reportar.

    Returns:
        ``BytesIO`` posicionado en el inicio, listo para ``send_file``.

    Raises:
        ValueError: Si el partido no existe o no está finalizado.
    """
    # ── Query 1: Partido + relaciones ─────────────────────────────
    partido = (
        Partido.query
        .options(
            joinedload(Partido.torneo),
            joinedload(Partido.equipo_local),
            joinedload(Partido.equipo_visitante),
            selectinload(Partido.estadisticas).joinedload(Estadistica.jugador),
        )
        .filter(Partido.id_partido == id_partido)
        .first()
    )

    if partido is None:
        raise ValueError('El partido especificado no existe.')

    if partido.estado not in ('finalizado', 'finalizado_wo'):
        raise ValueError(
            f'Solo se puede generar planilla de partidos finalizados. '
            f'Estado actual: "{partido.estado}".'
        )

    # ── Query 2: Mapa numero_camiseta en una sola consulta in_ ────
    ids_equipos = [partido.id_equipo_local, partido.id_equipo_visitante]
    plantillas = (
        Plantilla.query
        .filter(
            Plantilla.id_torneo == partido.id_torneo,
            Plantilla.id_equipo.in_(ids_equipos),
        )
        .all()
    )
    # {id_jugador: (numero_camiseta, id_equipo)} — todo en memoria
    camiseta_map = {p.id_jugador: p.numero_camiseta for p in plantillas}
    jugador_equipo_map = {p.id_jugador: p.id_equipo for p in plantillas}

    # ── Separar estadísticas por equipo en memoria (O(n)) ────────
    stats_local = [
        e for e in partido.estadisticas
        if jugador_equipo_map.get(e.id_jugador) == partido.id_equipo_local
    ]
    stats_visitante = [
        e for e in partido.estadisticas
        if jugador_equipo_map.get(e.id_jugador) == partido.id_equipo_visitante
    ]

    # Ordenar por puntos descendente para una lectura más cómoda
    stats_local.sort(key=lambda e: e.puntos_anotados, reverse=True)
    stats_visitante.sort(key=lambda e: e.puntos_anotados, reverse=True)

    # ── Generación del PDF en memoria con Platypus ────────────────
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=1.5*cm,
        rightMargin=1.5*cm,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm,
        title=f'Planilla Partido {id_partido}',
        author='Sistema de Torneos Salesianos',
    )

    estilos = _estilos()
    elementos = []

    # ── BLOQUE 1: Encabezado del documento ────────────────────────
    elementos.append(Paragraph(
        f'PLANILLA OFICIAL DE PARTIDO — {partido.torneo.nombre.upper()}',
        estilos['titulo'],
    ))
    fecha_str = partido.fecha.strftime('%d de %B de %Y') if partido.fecha else 'Sin fecha'
    hora_str = partido.hora.strftime('%H:%M') if partido.hora else ''
    elementos.append(Paragraph(
        f'Fase: {partido.fase}  ·  Fecha: {fecha_str} {hora_str}  ·  '
        f'Ubicación: {partido.ubicacion}',
        estilos['subtitulo'],
    ))
    elementos.append(Spacer(1, 0.3*cm))

    # ── BLOQUE 2: Marcador final ──────────────────────────────────
    nombre_local = partido.equipo_local.nombre_equipo.upper()
    nombre_visitante = partido.equipo_visitante.nombre_equipo.upper()
    elementos.append(Paragraph(
        f'{nombre_local}  {partido.marcador_local} — {partido.marcador_visitante}  {nombre_visitante}',
        estilos['marcador'],
    ))
    elementos.append(Spacer(1, 0.4*cm))

    # ── BLOQUE 3: Tabla equipo local ──────────────────────────────
    elementos.append(Paragraph(
        f'▶  {nombre_local}  (Local)',
        estilos['equipo_header'],
    ))
    if stats_local:
        elementos.append(_tabla_equipo(stats_local, camiseta_map))
    else:
        elementos.append(Paragraph(
            'Sin estadísticas registradas para este equipo.',
            estilos['subtitulo'],
        ))

    elementos.append(Spacer(1, 0.5*cm))

    # ── BLOQUE 4: Tabla equipo visitante ─────────────────────────
    elementos.append(Paragraph(
        f'▶  {nombre_visitante}  (Visitante)',
        estilos['equipo_header'],
    ))
    if stats_visitante:
        elementos.append(_tabla_equipo(stats_visitante, camiseta_map))
    else:
        elementos.append(Paragraph(
            'Sin estadísticas registradas para este equipo.',
            estilos['subtitulo'],
        ))

    elementos.append(Spacer(1, 0.6*cm))

    # ── BLOQUE 5: Footer ──────────────────────────────────────────
    from datetime import datetime
    elementos.append(Paragraph(
        f'Documento generado automáticamente · Sistema de Torneos Salesianos Manta · '
        f'{datetime.now().strftime("%d/%m/%Y %H:%M")}',
        estilos['footer'],
    ))

    # ── Build y retorno del buffer ────────────────────────────────
    doc.build(elementos)
    buffer.seek(0)   # Reposicionar al inicio para Flask send_file
    return buffer
