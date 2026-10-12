"""
Motor de posiciones — cálculo de tabla de clasificación por torneo (SRP).

Módulo dedicado exclusivamente al recálculo de standings, siguiendo el
principio de Responsabilidad Única (S de SOLID) y la advertencia
arquitectónica #3: el recálculo no debe ejecutarse inline dentro de
``partido_service``.

Eficiencia garantizada:
    - **Una sola query** a la tabla ``partidos`` para traer todos los
      encuentros finalizados del torneo.
    - **Procesamiento en memoria** con un ``defaultdict``: cero queries
      adicionales durante el cálculo estadístico.
    - **Una query de enriquecimiento** usando ``in_`` para traer los
      nombres y logos de todos los equipos participantes de una sola vez.

Reglas FIBA implementadas:
    - ``finalizado``: Ganador 2 pts, Perdedor 1 pt.
    - ``finalizado_wo``: Ganador 2 pts, Perdedor 0 pts.
      Si el marcador es 0-0 (default), se asume victoria del equipo local
      con marcador simbólico 20-0.
    - Desempate (reglamento FIBA D.1, el que aplica el organizador): entre los
      equipos empatados en puntos cuentan solo los partidos entre sí: primero
      las victorias, luego la diferencia de puntos y luego los puntos anotados.
      Si algún equipo se separa, el procedimiento vuelve a empezar con los que
      siguen empatados. Si nada los separa, diferencia y puntos de todo el torneo.
"""
from collections import defaultdict
from itertools import groupby


def _agrupar(ids, valor):
    """Parte ``ids`` en bloques con el mismo ``valor``, de mayor a menor."""
    ordenados = sorted(ids, key=valor, reverse=True)
    return [list(g) for _, g in groupby(ordenados, key=valor)]


def _mini_tabla(ids, resultados):
    """Victorias, diferencia y puntos a favor contando solo los partidos entre ``ids``."""
    grupo = set(ids)
    t = {i: {'PG': 0, 'DIF': 0, 'PF': 0} for i in ids}
    for a, b, pa, pb in resultados:
        if a in grupo and b in grupo:
            t[a]['PF'] += pa
            t[a]['DIF'] += pa - pb
            t[b]['PF'] += pb
            t[b]['DIF'] += pb - pa
            t[a if pa >= pb else b]['PG'] += 1
    return t


def desempatar(ids, resultados, globales):
    """Ordena equipos empatados en puntos.

    ``resultados``: lista de (local, visitante, puntos_local, puntos_visitante) con
    marcadores efectivos (el W.O. ya viene como 20-0). ``globales``: dict por equipo
    con 'DIF' y 'PF' de todo el torneo.
    """
    if len(ids) < 2:
        return list(ids)
    mini = _mini_tabla(ids, resultados)
    criterios = [lambda i, c=c: mini[i][c] for c in ('PG', 'DIF', 'PF')]
    criterios += [lambda i, c=c: globales[i][c] for c in ('DIF', 'PF')]
    for criterio in criterios:
        bloques = _agrupar(ids, criterio)
        if len(bloques) > 1:
            # Alguien se separó: el procedimiento vuelve a empezar con cada bloque
            return [e for bloque in bloques for e in desempatar(bloque, resultados, globales)]
    # ponytail: FIBA sortea; aquí queda el orden por id, estable para que la tabla no baile
    return sorted(ids)

from app import db
from app.models.partido import Partido


def recalcular_tabla(id_torneo: int, id_categoria: int = None) -> list[dict]:
    """Calcula la tabla de posiciones completa para un torneo y categoría.

    Algoritmo en tres pasos:
        1. **Una query SQL** → trae partidos finalizados del torneo.
        2. **Procesamiento en memoria** → acumula estadísticas por equipo en un dict.
        3. **Una query de enriquecimiento** → trae nombre y logo de equipos con ``in_``.

    Args:
        id_torneo: ID del torneo a procesar.
        id_categoria: ID de la categoría a procesar.

    Returns:
        Lista de dicts ordenada por: Puntos DESC → DIF DESC → PF DESC.
        Cada elemento contiene::

            {
                "posicion": 1,
                "id_equipo": 42,
                "nombre_equipo": "Delfines BC",
                "url_logo": "https://...",
                "PJ": 5, "PG": 4, "PP": 1,
                "PF": 320, "PC": 280,
                "DIF": 40,
                "puntos": 9
            }
    """
    # ── PASO 1: Una sola query para todos los partidos finalizados ─
    estados_finales = ('finalizado', 'finalizado_wo')

    query = Partido.query.filter(
        Partido.id_torneo == id_torneo,
        Partido.estado.in_(estados_finales),
    )

    if id_categoria is not None:
        query = query.filter(Partido.id_categoria == id_categoria)

    partidos = query.all()

    if not partidos:
        return []

    # ── PASO 2: Procesamiento en memoria con defaultdict ──────────
    # Cada equipo comienza con estadísticas en cero.
    # El defaultdict elimina la necesidad de verificar si el equipo
    # ya existe antes de acumular.
    def _equipo_inicial():
        """Retorna dict con estadísticas inicializadas en cero para un equipo."""
        return {'PJ': 0, 'PG': 0, 'PP': 0, 'PF': 0, 'PC': 0, 'puntos': 0}

    tabla = defaultdict(_equipo_inicial)
    
    # ── Para el desempate: marcadores efectivos de cada partido ───
    resultados = []

    for p in partidos:
        es_wo = p.estado == 'finalizado_wo'

        # ── Determinar marcadores efectivos ──────────────────────
        # Para WO con marcador 0-0 (default), se asume 20-0 local.
        if es_wo and p.marcador_local == 0 and p.marcador_visitante == 0:
            pf_local, pc_local = 20, 0
            pf_visitante, pc_visitante = 0, 20
            gano_local = True
        else:
            pf_local = p.marcador_local
            pc_local = p.marcador_visitante
            pf_visitante = p.marcador_visitante
            pc_visitante = p.marcador_local
            # En baloncesto no hay empates — si los marcadores son iguales
            # en un partido real, se asigna victoria al local por defecto.
            gano_local = pf_local >= pf_visitante

        pts_ganador = 2
        pts_perdedor = 0 if es_wo else 1

        # ── Acumular estadísticas del equipo local ────────────────
        tabla[p.id_equipo_local]['PJ'] += 1
        tabla[p.id_equipo_local]['PF'] += pf_local
        tabla[p.id_equipo_local]['PC'] += pc_local

        # ── Acumular estadísticas del equipo visitante ────────────
        tabla[p.id_equipo_visitante]['PJ'] += 1
        tabla[p.id_equipo_visitante]['PF'] += pf_visitante
        tabla[p.id_equipo_visitante]['PC'] += pc_visitante

        # ── Asignar victorias, derrotas y puntos clasificación ────
        if gano_local:
            tabla[p.id_equipo_local]['PG'] += 1
            tabla[p.id_equipo_local]['puntos'] += pts_ganador
            tabla[p.id_equipo_visitante]['PP'] += 1
            tabla[p.id_equipo_visitante]['puntos'] += pts_perdedor
        else:
            tabla[p.id_equipo_visitante]['PG'] += 1
            tabla[p.id_equipo_visitante]['puntos'] += pts_ganador
            tabla[p.id_equipo_local]['PP'] += 1
            tabla[p.id_equipo_local]['puntos'] += pts_perdedor
        resultados.append((p.id_equipo_local, p.id_equipo_visitante, pf_local, pf_visitante))

    # ── PASO 3: Enriquecimiento con una sola query in_ ────────────
    # Traer nombre y logo de todos los equipos participantes de una vez,
    # evitando N queries adicionales (una por equipo).
    from app.models.equipo import Equipo

    ids_equipos = list(tabla.keys())
    equipos_db = db.session.execute(
        db.select(Equipo.id_equipo, Equipo.nombre_equipo, Equipo.url_logo)
        .where(Equipo.id_equipo.in_(ids_equipos))
    ).all()

    equipos_map = {row.id_equipo: row for row in equipos_db}

    # ── PASO 4: Construir lista y calcular DIF ────────────────────
    lista = []
    for id_equipo, stats in tabla.items():
        equipo_data = equipos_map.get(id_equipo)
        lista.append({
            'id_equipo': id_equipo,
            'nombre_equipo': equipo_data.nombre_equipo if equipo_data else f'Equipo #{id_equipo}',
            'url_logo': equipo_data.url_logo if equipo_data else None,
            'PJ': stats['PJ'],
            'PG': stats['PG'],
            'PP': stats['PP'],
            'PF': stats['PF'],
            'PC': stats['PC'],
            'DIF': stats['PF'] - stats['PC'],
            'puntos': stats['puntos'],
        })

    # ── PASO 5: Ordenar por puntos y desempatar por bloques (FIBA D.1) ──
    por_id = {fila['id_equipo']: fila for fila in lista}
    globales = {i: {'DIF': f['DIF'], 'PF': f['PF']} for i, f in por_id.items()}
    orden = [
        e
        for bloque in _agrupar(list(por_id), lambda i: por_id[i]['puntos'])
        for e in desempatar(bloque, resultados, globales)
    ]
    lista = [por_id[i] for i in orden]

    # ── PASO 6: Agregar número de posición ────────────────────────
    for i, entrada in enumerate(lista, start=1):
        entrada['posicion'] = i

    return lista
