"""Tabla de posiciones FIBA, en Python puro.

Reglas:
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


def relegar(tabla, inactivos):
    """Un equipo inactivo quedó fuera del torneo: va último con todo en cero, y los demás conservan lo que jugaron
    contra él. Las posiciones se renumeran."""
    lista = [f for f in tabla if f['id_equipo'] not in inactivos]
    lista += [dict(f, PJ=0, PG=0, PP=0, PF=0, PC=0, DIF=0, puntos=0) for f in tabla if f['id_equipo'] in inactivos]
    for i, fila in enumerate(lista, start=1):
        fila['posicion'] = i
    return lista


def tablas_por_grupo(partidos, grupos, inactivos=frozenset()):
    """Una tabla por grupo. Sin grupos asignados devuelve {None: tabla única}.

    Solo cuentan los partidos entre equipos del mismo grupo; los equipos sin partidos aparecen en cero y los
    ``inactivos``, últimos (``relegar``).
    """
    letras = sorted({g for g in grupos.values() if g})
    if not letras:
        return {None: relegar(calcular_tabla(partidos, grupos.keys()), inactivos)}
    tablas = {}
    for letra in letras:
        miembros = {e for e, g in grupos.items() if g == letra}
        propios = [p for p in partidos if p[0] in miembros and p[1] in miembros]
        tablas[letra] = relegar(calcular_tabla(propios, miembros), inactivos)
    return tablas


def filas_con_equipo(tablas, equipos):
    """Filas de la respuesta, por grupo y posición; ``equipos``: {id_equipo: con ``nombre_equipo`` y ``url_logo``}."""
    lista = []
    for letra, tabla in tablas.items():
        for fila in tabla:
            equipo = equipos.get(fila['id_equipo'])
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
