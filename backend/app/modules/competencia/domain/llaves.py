"""Fase final, en Python puro: formatos, cuadro de llaves, grupos y recorrido de la fase de grupos.

Cada formato es una lista de llaves ``(código, local, visitante)``. Las referencias:
    - ``1A``: 1.º de la tabla del grupo A; ``3``: 3.º del grupo único.
    - ``G:SF1`` / ``P:SF1``: ganador / perdedor de la llave SF1.
Los equipos de una referencia a la tabla solo se resuelven cuando la fase de
grupos terminó (todos los partidos esperados jugados): antes, el cruce queda
"por definir". Cada resultado cargado habilita las llaves siguientes.
"""
from dataclasses import dataclass

from app.modules.competencia.domain.posiciones import ESTADOS_FINALES, marcador_efectivo, tablas_por_grupo
from app.shared.domain.errores import ReglaDeNegocio

FORMATOS = {
    'dos_grupos_cruces': {
        'nombre': 'Dos grupos con cruces',
        'descripcion': 'Dos grupos, todos contra todos. Clasifican 4 por grupo: 1.º A vs 4.º B, 2.º B vs 3.º A, 1.º B vs 4.º A y 2.º A vs 3.º B; luego semifinales, tercer puesto y final.',
        'grupos': ['A', 'B'],
        'cupos': 4,
        'llaves': [
            ('CF1', '1A', '4B'), ('CF2', '2B', '3A'), ('CF3', '1B', '4A'), ('CF4', '2A', '3B'),
            ('SF1', 'G:CF1', 'G:CF2'), ('SF2', 'G:CF3', 'G:CF4'),
            ('3P', 'P:SF1', 'P:SF2'), ('F', 'G:SF1', 'G:SF2'),
        ],
    },
    'un_grupo_semis': {
        'nombre': 'Un grupo, semifinales 1-4 y 2-3',
        'descripcion': 'Todos contra todos. Los cuatro primeros juegan semifinales (1.º vs 4.º y 2.º vs 3.º), tercer puesto y final.',
        'grupos': [],
        'cupos': 4,
        'llaves': [('SF1', '1', '4'), ('SF2', '2', '3'), ('3P', 'P:SF1', 'P:SF2'), ('F', 'G:SF1', 'G:SF2')],
    },
    'tres_final_directa': {
        'nombre': 'Tres equipos, final directa',
        'descripcion': 'Todos contra todos, ida y vuelta. El 1.º pasa a la final; el 2.º y el 3.º juegan un repechaje por el otro cupo.',
        'grupos': [],
        'cupos': 3,
        'vueltas': 2,  # ponytail: con 3 equipos el organizador juega ida y vuelta; el resto de formatos, una vuelta
        'llaves': [('R', '2', '3'), ('F', '1', 'G:R')],
    },
}
RONDAS = {'CF': 'Cuartos de final', 'SF': 'Semifinal', '3P': 'Tercer puesto', 'F': 'Final', 'R': 'Repechaje'}
ORDINAL = {'1': '1.º', '2': '2.º', '3': '3.º', '4': '4.º'}


def ronda_de(codigo):
    return RONDAS['3P' if codigo == '3P' else codigo.rstrip('0123456789')]


def _texto_ref(ref):
    """'1A' → '1.º del grupo A', '3' → '3.º', 'G:SF1' → 'Ganador SF1'."""
    if ref.startswith('G:'):
        return f'Ganador {ref[2:]}'
    if ref.startswith('P:'):
        return f'Perdedor {ref[2:]}'
    puesto, grupo = ref[0], ref[1:]
    return f'{ORDINAL[puesto]} del grupo {grupo}' if grupo else ORDINAL[puesto]


def _resolver(ref, tablas, ganadores, perdedores):
    """Id del equipo al que apunta la referencia, o None si todavía no se sabe."""
    if ref.startswith('G:'):
        return ganadores.get(ref[2:])
    if ref.startswith('P:'):
        return perdedores.get(ref[2:])
    puesto, grupo = int(ref[0]), (ref[1:] or None)
    tabla = tablas.get(grupo) or []
    return tabla[puesto - 1]['id_equipo'] if len(tabla) >= puesto else None


def _vueltas(formato):
    return formato.get('vueltas', 1) if formato else 1


def _partidos_esperados(grupos, vueltas=1):
    """Todos contra todos dentro de cada grupo (o del grupo único), una o dos vueltas."""
    conteo = {}
    for g in grupos.values():
        conteo[g] = conteo.get(g, 0) + 1
    return vueltas * sum(n * (n - 1) // 2 for n in conteo.values())


@dataclass
class Categoria:
    """Lo que la fase final usa de una categoría; ``formato`` es una clave de ``FORMATOS`` o None."""
    id_categoria: int
    id_torneo: int | None = None
    formato: str | None = None


def estado_fase_final(categoria, grupos, partidos_grupos, pendientes, jugados, equipos):
    """Estado completo de la fase final de una categoría (ver docstring del módulo).

    ``grupos``: {id_equipo: grupo} de las inscripciones aprobadas. ``partidos_grupos``: los finalizados de la fase
    de grupos, como tuplas para ``calcular_tabla``. ``pendientes``: cuántos de la fase de grupos están programados o
    en curso. ``jugados``: {llave: partido como dict} de las llaves no anuladas. ``equipos``: {id_equipo: con
    ``nombre_equipo`` y ``url_logo``}.
    """
    formato = FORMATOS.get(categoria.formato)
    esperados = _partidos_esperados(grupos, _vueltas(formato))
    terminada = esperados > 0 and len(partidos_grupos) >= esperados and pendientes == 0
    estado = {
        'id_torneo': categoria.id_torneo,
        'id_categoria': categoria.id_categoria,
        'formato': categoria.formato,
        'formatos': {k: {'nombre': v['nombre'], 'descripcion': v['descripcion'], 'grupos': v['grupos'], 'cupos': v['cupos']} for k, v in FORMATOS.items()},
        'grupos': {e: g for e, g in grupos.items()},
        'fase_grupos': {'jugados': len(partidos_grupos), 'esperados': esperados, 'pendientes': pendientes, 'terminada': terminada},
        'llaves': [],
    }
    if not formato:
        return estado

    tablas = tablas_por_grupo(partidos_grupos, grupos) if terminada else {}
    ganadores, perdedores = {}, {}
    for codigo, p in jugados.items():
        if p['estado'] in ESTADOS_FINALES:
            ml, mv = marcador_efectivo(p['estado'], p['marcador_local'], p['marcador_visitante'])
            ganadores[codigo], perdedores[codigo] = (p['id_equipo_local'], p['id_equipo_visitante']) if ml >= mv else (p['id_equipo_visitante'], p['id_equipo_local'])

    def ficha(id_equipo):
        e = equipos.get(id_equipo)
        return {'id_equipo': id_equipo, 'nombre_equipo': e.nombre_equipo if e else f'Equipo #{id_equipo}', 'url_logo': e.url_logo if e else None} if id_equipo else None

    for codigo, ref_local, ref_visita in formato['llaves']:
        partido = jugados.get(codigo)
        if partido:
            local, visitante = partido['id_equipo_local'], partido['id_equipo_visitante']
            estado_llave = 'finalizado' if partido['estado'] in ESTADOS_FINALES else 'programado'
        else:
            local = _resolver(ref_local, tablas, ganadores, perdedores)
            visitante = _resolver(ref_visita, tablas, ganadores, perdedores)
            estado_llave = 'listo' if local and visitante else 'espera'
        estado['llaves'].append({
            'codigo': codigo,
            'ronda': ronda_de(codigo),
            'cruce': f'{_texto_ref(ref_local)} vs {_texto_ref(ref_visita)}',
            'ref_local': _texto_ref(ref_local),
            'ref_visitante': _texto_ref(ref_visita),
            'local': ficha(local),
            'visitante': ficha(visitante),
            'estado': estado_llave,
            'ganador': ganadores.get(codigo),
            'partido': partido,
        })
    return estado


def asignar_grupos(categoria, aprobados, grupos):
    """{id_equipo: letra o None} para cada equipo aprobado, en el orden de ``aprobados``.

    ``grupos``: lo pedido, {id_equipo (o su texto): 'A'}. Lanza ReglaDeNegocio si una letra no existe en el formato.
    """
    formato = FORMATOS.get(categoria.formato)
    permitidos = set(formato['grupos']) if formato else set()
    asignados = {}
    for id_equipo in aprobados:
        letra = grupos.get(id_equipo, grupos.get(str(id_equipo)))
        if letra and letra not in permitidos:
            raise ReglaDeNegocio(f"El grupo {letra} no existe en el formato de la categoría.")
        asignados[id_equipo] = letra or None
    return asignados


def recorrido(categoria, grupos, partidos, equipos):
    """Posición de cada equipo después de cada fecha de la fase de grupos y su situación.

    ``partidos``: los finalizados de la fase de grupos, ordenados por fecha, como
    (local, visitante, marcador_local, marcador_visitante, estado, fecha).
    Situación (con los puntos que todavía puede sumar cada uno, 2 por victoria):
    ``clasificado`` si ya nadie puede quitarle el cupo, ``eliminado`` si ya no alcanza,
    ``zona`` si hoy está dentro de los cupos y ``depende`` si hoy está fuera.
    ponytail: no mira desempates; en empate exacto deja al equipo en zona/depende.
    """
    formato = FORMATOS.get(categoria.formato)
    cupos = formato['cupos'] if formato else None
    fechas = sorted({p[5] for p in partidos})
    tuplas = lambda hasta: [p[:5] for p in partidos if p[5] <= hasta]
    por_fecha = [tablas_por_grupo(tuplas(f), grupos) for f in fechas]
    final = por_fecha[-1] if por_fecha else tablas_por_grupo([], grupos)

    salida = {'fechas': [f.isoformat() for f in fechas], 'cupos': cupos, 'grupos': []}
    for letra, tabla in final.items():
        n = len(tabla)
        por_jugar = (n - 1) * _vueltas(formato)  # partidos de cada equipo en la fase de grupos
        filas = []
        for f in tabla:
            restantes = max(0, por_jugar - f['PJ'])
            maximo = f['puntos'] + 2 * restantes
            if cupos is None or n <= cupos:
                situacion = 'zona'
            else:
                otros = [o for o in tabla if o['id_equipo'] != f['id_equipo']]
                fuera_de_alcance = sum(1 for o in otros if o['puntos'] + 2 * max(0, por_jugar - o['PJ']) < f['puntos'])
                imposibles = sum(1 for o in otros if o['puntos'] > maximo)
                terminado = all(o['PJ'] >= por_jugar for o in tabla)
                if terminado:
                    situacion = 'clasificado' if f['posicion'] <= cupos else 'eliminado'
                elif fuera_de_alcance >= n - cupos:
                    situacion = 'clasificado'
                elif imposibles >= cupos:
                    situacion = 'eliminado'
                else:
                    situacion = 'zona' if f['posicion'] <= cupos else 'depende'
            e = equipos.get(f['id_equipo'])
            filas.append({
                'id_equipo': f['id_equipo'],
                'nombre_equipo': e.nombre_equipo if e else f"Equipo #{f['id_equipo']}",
                'url_logo': e.url_logo if e else None,
                'posicion': f['posicion'],
                'PJ': f['PJ'], 'PG': f['PG'], 'PP': f['PP'], 'puntos': f['puntos'],
                'restantes': restantes,
                'situacion': situacion,
                # posición después de cada fecha (None si el equipo aún no aparecía)
                'posiciones': [
                    next((x['posicion'] for x in t.get(letra, []) if x['id_equipo'] == f['id_equipo']), None)
                    for t in por_fecha
                ],
            })
        salida['grupos'].append({'grupo': letra, 'equipos': filas, 'terminado': n > 0 and all(x['PJ'] >= por_jugar for x in tabla)})
    return salida
