"""Datos para los flyers de Instagram: resultados de una fecha, las figuras y los líderes del torneo.

Figura = mayor valoración, que aquí es puntos + rebotes + asistencias + tapones (lo que se
registra por partido; no hay tiros fallados, robos ni pérdidas). En empate, más puntos.
El equipo de cada jugador en un partido sale de la plantilla del torneo: es el lado del
partido (local o visitante) en cuya plantilla está.
Los líderes (mayor encestador, triplista…) se ordenan en el frontend con los totales por
jugador de la fecha y del torneo (``jugadores_fecha`` y ``jugadores_torneo``).
"""
from collections import Counter, defaultdict

from sqlalchemy.orm import joinedload

from app import db
from app.models import Categoria, Equipo, Estadistica, Partido, Plantilla, Torneo

FINALES = ('finalizado', 'finalizado_wo')
CAMPOS = ('puntos', 'rebotes', 'asistencias', 'tapones', 'triples', 'tiros_libres')


def _linea(e):
    return {
        'puntos': e.puntos_anotados or 0, 'rebotes': e.rebotes or 0, 'asistencias': e.asistencias or 0,
        'tapones': e.tapones or 0, 'triples': e.triples_anotados or 0, 'tiros_libres': e.tiros_libres_anotados or 0,
    }


def _valoracion(linea):
    return linea['puntos'] + linea['rebotes'] + linea['asistencias'] + linea['tapones']


def _etiqueta(c):
    """'Juvenil (masculino)'; si el nombre ya dice el género ('Cadetes +30 Femenino') no se repite."""
    genero = (c.genero_categoria or '').strip()
    return c.nombre_categoria if not genero or genero.lower() in c.nombre_categoria.lower() else f'{c.nombre_categoria} ({genero})'


def _orden(item):
    return (item['valoracion'], item['linea']['puntos'])


def datos_flyers(id_torneo, fecha=None):
    """Resultados de ``fecha`` (por defecto la última con partidos jugados), su figura y las figuras por categoría y por equipo."""
    torneo = db.session.get(Torneo, id_torneo)
    if torneo is None:
        raise ValueError('El torneo no existe.')

    partidos = Partido.query.filter(Partido.id_torneo == id_torneo, Partido.estado.in_(FINALES)).all()
    fechas = sorted({p.fecha for p in partidos}, reverse=True)
    if fecha is None and fechas:
        fecha = fechas[0]

    categorias = {c.id_categoria: _etiqueta(c) for c in Categoria.query.filter_by(id_torneo=id_torneo).all()}
    ids_equipos = {i for p in partidos for i in (p.id_equipo_local, p.id_equipo_visitante)}
    equipos = {e.id_equipo: e for e in Equipo.query.filter(Equipo.id_equipo.in_(ids_equipos)).all()} if ids_equipos else {}
    plantilla = {
        (p.id_jugador, p.id_equipo): p.numero_camiseta
        for p in Plantilla.query.filter_by(id_torneo=id_torneo).all()
    }
    estadisticas = (
        Estadistica.query.options(joinedload(Estadistica.jugador))
        .join(Partido, Partido.id_partido == Estadistica.id_partido)
        .filter(Partido.id_torneo == id_torneo, Partido.estado == 'finalizado')
        .all()
    )
    por_id = {p.id_partido: p for p in partidos}

    def ficha_equipo(id_equipo):
        e = equipos.get(id_equipo)
        return {'id_equipo': id_equipo, 'nombre_equipo': e.nombre_equipo if e else f'Equipo #{id_equipo}', 'url_logo': e.url_logo if e else None}

    def nombre_partido(p):
        return f"{ficha_equipo(p.id_equipo_local)['nombre_equipo']} vs {ficha_equipo(p.id_equipo_visitante)['nombre_equipo']}"

    # Cada estadística con su partido y el equipo del jugador en ese partido
    filas = []
    for e in estadisticas:
        p = por_id.get(e.id_partido)
        if p is None:
            continue
        equipo = next((lado for lado in (p.id_equipo_local, p.id_equipo_visitante) if (e.id_jugador, lado) in plantilla), None)
        filas.append((e, p, equipo))

    def figura(e, p, equipo):
        linea = _linea(e)
        return {
            'jugador': {
                'id_jugador': e.id_jugador,
                'nombre': e.jugador.nombre if e.jugador else f'Jugador #{e.id_jugador}',
                'url_foto': e.jugador.url_foto if e.jugador else None,
                'numero_camiseta': plantilla.get((e.id_jugador, equipo)),
            },
            'equipo': ficha_equipo(equipo) if equipo else None,
            'categoria': categorias.get(p.id_categoria),
            'partido': nombre_partido(p),
            'linea': linea,
            'valoracion': _valoracion(linea),
        }

    # ── Resultados de la fecha y su figura ──
    del_dia = sorted((p for p in partidos if p.fecha == fecha), key=lambda p: (p.hora, p.id_partido))
    figuras_partido = {}
    for e, p, equipo in filas:
        if p.fecha == fecha:
            f = figura(e, p, equipo)
            if p.id_partido not in figuras_partido or _orden(f) > _orden(figuras_partido[p.id_partido]):
                figuras_partido[p.id_partido] = f
    resultados = [
        {
            'id_partido': p.id_partido,
            'hora': p.hora.strftime('%H:%M') if p.hora else None,
            'categoria': categorias.get(p.id_categoria),
            'fase': p.fase,
            'estado': p.estado,
            'local': dict(ficha_equipo(p.id_equipo_local), marcador=p.marcador_local),
            'visitante': dict(ficha_equipo(p.id_equipo_visitante), marcador=p.marcador_visitante),
            'figura': figuras_partido.get(p.id_partido),
        }
        for p in del_dia
    ]
    figura_fecha = max(figuras_partido.values(), key=_orden, default=None)

    # ── Totales por jugador (y categoría): del torneo y de la fecha ──
    def acumular(filas_elegidas):
        acumulado = defaultdict(lambda: {'linea': dict.fromkeys(CAMPOS, 0), 'partidos': 0, 'equipos': Counter(), 'jugador': None, 'ultimo': None})
        for e, p, equipo in filas_elegidas:
            a = acumulado[(p.id_categoria, e.id_jugador)]
            for campo, valor in _linea(e).items():
                a['linea'][campo] += valor
            a['partidos'] += 1
            if equipo:
                a['equipos'][equipo] += 1
            a['jugador'], a['ultimo'] = e.jugador, p
        return acumulado

    acumulado = acumular(filas)

    def figura_acumulada(id_categoria, id_jugador, a):
        equipo = a['equipos'].most_common(1)[0][0] if a['equipos'] else None
        return {
            'jugador': {
                'id_jugador': id_jugador,
                'nombre': a['jugador'].nombre if a['jugador'] else f'Jugador #{id_jugador}',
                'url_foto': a['jugador'].url_foto if a['jugador'] else None,
                'numero_camiseta': plantilla.get((id_jugador, equipo)),
            },
            'equipo': ficha_equipo(equipo) if equipo else None,
            'categoria': categorias.get(id_categoria),
            'id_categoria': id_categoria,
            'linea': a['linea'],
            'partidos': a['partidos'],
            'partido': nombre_partido(a['ultimo']) if a['partidos'] == 1 else None,
            'promedio_puntos': round(a['linea']['puntos'] / a['partidos'], 1) if a['partidos'] else 0,
            'valoracion': _valoracion(a['linea']),
        }

    mejores_categoria, mejores_equipo = {}, {}
    for (id_categoria, id_jugador), a in acumulado.items():
        f = figura_acumulada(id_categoria, id_jugador, a)
        if id_categoria not in mejores_categoria or _orden(f) > _orden(mejores_categoria[id_categoria]):
            mejores_categoria[id_categoria] = f
        if f['equipo']:
            clave = (f['equipo']['id_equipo'], id_categoria)
            if clave not in mejores_equipo or _orden(f) > _orden(mejores_equipo[clave]):
                mejores_equipo[clave] = f

    return {
        'torneo': {'id_torneo': torneo.id_torneo, 'nombre': torneo.nombre},
        'fecha': fecha.isoformat() if fecha else None,
        'fechas': [f.isoformat() for f in fechas],
        'resultados': resultados,
        'figura_fecha': figura_fecha,
        'figuras_categoria': sorted(mejores_categoria.values(), key=lambda f: f['categoria'] or ''),
        'figuras_equipo': sorted(mejores_equipo.values(), key=lambda f: (f['categoria'] or '', f['equipo']['nombre_equipo'])),
        'jugadores_fecha': [figura_acumulada(c, j, a) for (c, j), a in acumular(f for f in filas if f[1].fecha == fecha).items()],
        'jugadores_torneo': [figura_acumulada(c, j, a) for (c, j), a in acumulado.items()],
    }
