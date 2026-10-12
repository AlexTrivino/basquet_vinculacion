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

Grupos: cuando la categoría tiene grupos (``inscripciones.grupo``), cada grupo
tiene su propia tabla y solo cuentan los partidos de la fase de grupos
(``partidos.llave`` nulo). Las filas llevan ``grupo`` y ``posicion`` dentro del grupo.
"""
from collections import defaultdict
from itertools import groupby

from app import db
from app.models.inscripcion import Inscripcion
from app.models.partido import Partido

ESTADOS_FINALES = ('finalizado', 'finalizado_wo')


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


def marcador_efectivo(estado, marcador_local, marcador_visitante):
    """Marcador con el que se cuenta el partido: un W.O. sin marcador vale 20-0 para el local."""
    if estado == 'finalizado_wo' and marcador_local == 0 and marcador_visitante == 0:
        return 20, 0
    return marcador_local, marcador_visitante


def calcular_tabla(partidos, equipos=()):
    """Tabla ordenada a partir de partidos finalizados, sin tocar la base.

    ``partidos``: iterable de (id_local, id_visitante, marcador_local, marcador_visitante, estado).
    ``equipos``: ids que deben aparecer aunque no hayan jugado (quedan con todo en cero).

    Devuelve una lista de dicts con id_equipo, PJ, PG, PP, PF, PC, DIF, puntos y posicion.
    """
    def _inicial():
        return {'PJ': 0, 'PG': 0, 'PP': 0, 'PF': 0, 'PC': 0, 'puntos': 0}

    tabla = defaultdict(_inicial)
    for e in equipos:
        tabla[e]
    resultados = []
    for local, visitante, ml, mv, estado in partidos:
        if estado not in ESTADOS_FINALES:
            continue
        es_wo = estado == 'finalizado_wo'
        pf_local, pf_visitante = marcador_efectivo(estado, ml, mv)
        # En baloncesto no hay empates: si los marcadores son iguales, se asigna victoria al local
        gano_local = pf_local >= pf_visitante
        ganador, perdedor = (local, visitante) if gano_local else (visitante, local)

        tabla[local]['PJ'] += 1
        tabla[local]['PF'] += pf_local
        tabla[local]['PC'] += pf_visitante
        tabla[visitante]['PJ'] += 1
        tabla[visitante]['PF'] += pf_visitante
        tabla[visitante]['PC'] += pf_local
        tabla[ganador]['PG'] += 1
        tabla[ganador]['puntos'] += 2
        tabla[perdedor]['PP'] += 1
        tabla[perdedor]['puntos'] += 0 if es_wo else 1
        resultados.append((local, visitante, pf_local, pf_visitante))

    filas = {i: dict(s, id_equipo=i, DIF=s['PF'] - s['PC']) for i, s in tabla.items()}
    globales = {i: {'DIF': f['DIF'], 'PF': f['PF']} for i, f in filas.items()}
    orden = [
        e
        for bloque in _agrupar(list(filas), lambda i: filas[i]['puntos'])
        for e in desempatar(bloque, resultados, globales)
    ]
    lista = [filas[i] for i in orden]
    for i, fila in enumerate(lista, start=1):
        fila['posicion'] = i
    return lista


def grupos_de_categoria(id_torneo, id_categoria):
    """{id_equipo: grupo} de las inscripciones aprobadas de la categoría (grupo puede ser None)."""
    filas = db.session.execute(
        db.select(Inscripcion.id_equipo, Inscripcion.grupo).where(
            Inscripcion.id_torneo == id_torneo,
            Inscripcion.id_categoria == id_categoria,
            Inscripcion.estado_inscripcion == 'aprobado',
        )
    ).all()
    return {f.id_equipo: f.grupo for f in filas}


def partidos_fase_grupos(id_torneo, id_categoria=None, hasta_fecha=None):
    """Partidos finalizados de la fase de grupos (sin llave), como tuplas para ``calcular_tabla``."""
    query = Partido.query.filter(
        Partido.id_torneo == id_torneo,
        Partido.estado.in_(ESTADOS_FINALES),
        Partido.llave.is_(None),
    )
    if id_categoria is not None:
        query = query.filter(Partido.id_categoria == id_categoria)
    if hasta_fecha is not None:
        query = query.filter(Partido.fecha <= hasta_fecha)
    return [(p.id_equipo_local, p.id_equipo_visitante, p.marcador_local, p.marcador_visitante, p.estado) for p in query.all()]


def tablas_por_grupo(partidos, grupos):
    """Una tabla por grupo. Sin grupos asignados devuelve {None: tabla única}.

    Solo cuentan los partidos entre equipos del mismo grupo; los equipos sin partidos aparecen en cero.
    """
    letras = sorted({g for g in grupos.values() if g})
    if not letras:
        return {None: calcular_tabla(partidos, grupos.keys())}
    tablas = {}
    for letra in letras:
        miembros = {e for e, g in grupos.items() if g == letra}
        propios = [p for p in partidos if p[0] in miembros and p[1] in miembros]
        tablas[letra] = calcular_tabla(propios, miembros)
    return tablas


def recalcular_tabla(id_torneo: int, id_categoria: int = None) -> list[dict]:
    """Calcula la tabla de posiciones completa para un torneo y categoría.

    Algoritmo en tres pasos:
        1. **Una query SQL** → trae partidos finalizados de la fase de grupos.
        2. **Procesamiento en memoria** → acumula estadísticas por equipo en un dict.
        3. **Una query de enriquecimiento** → trae nombre y logo de equipos con ``in_``.

    Args:
        id_torneo: ID del torneo a procesar.
        id_categoria: ID de la categoría a procesar. Con categoría, los equipos
            inscritos aparecen aunque no hayan jugado y, si hay grupos, cada
            grupo tiene su tabla (las filas llevan ``grupo``).

    Returns:
        Lista de dicts ordenada por grupo y posición. Cada elemento contiene::

            {
                "posicion": 1, "grupo": "A",
                "id_equipo": 42,
                "nombre_equipo": "Delfines BC",
                "url_logo": "https://...",
                "PJ": 5, "PG": 4, "PP": 1,
                "PF": 320, "PC": 280,
                "DIF": 40,
                "puntos": 9
            }
    """
    partidos = partidos_fase_grupos(id_torneo, id_categoria)
    grupos = grupos_de_categoria(id_torneo, id_categoria) if id_categoria is not None else {}
    if not partidos and not grupos:
        return []

    tablas = tablas_por_grupo(partidos, grupos)

    # ── Enriquecimiento con una sola query in_ ────────────────────
    from app.models.equipo import Equipo

    ids_equipos = [f['id_equipo'] for tabla in tablas.values() for f in tabla]
    equipos_db = db.session.execute(
        db.select(Equipo.id_equipo, Equipo.nombre_equipo, Equipo.url_logo)
        .where(Equipo.id_equipo.in_(ids_equipos))
    ).all()
    equipos_map = {row.id_equipo: row for row in equipos_db}

    lista = []
    for letra, tabla in tablas.items():
        for fila in tabla:
            equipo = equipos_map.get(fila['id_equipo'])
            lista.append({
                'posicion': fila['posicion'],
                'grupo': letra,
                'id_equipo': fila['id_equipo'],
                'nombre_equipo': equipo.nombre_equipo if equipo else f"Equipo #{fila['id_equipo']}",
                'url_logo': equipo.url_logo if equipo else None,
                'PJ': fila['PJ'],
                'PG': fila['PG'],
                'PP': fila['PP'],
                'PF': fila['PF'],
                'PC': fila['PC'],
                'DIF': fila['DIF'],
                'puntos': fila['puntos'],
            })
    return lista
