"""Podio de una categoría, en Python puro.

Con fase final, el campeón y el vicecampeón salen de la final (F) y el tercero, del partido por el tercer puesto (3P)
o, en el formato de tres equipos, de quien perdió el repechaje (R). Sin la final jugada todavía no hay podio. Sin
formato de llaves, los tres primeros de la tabla única, y solo con el torneo finalizado.

Cada puesto lleva lo que el equipo hizo en todo el torneo (fase de grupos y llaves) y sus sellos: ``invicto`` (sin
derrotas) y ``mas_puntos`` (nadie de la categoría anotó más).

También las reglas de la foto del ganador para el flyer: las medidas que se aceptan y el encuadre que se guarda.
"""
from app.modules.competencia.domain.posiciones import calcular_tabla, marcador_efectivo
from app.shared.domain.errores import ReglaDeNegocio

TOTALES = ('PJ', 'PG', 'PP', 'PF', 'PC')

# La foto del flyer: el héroe mide 1080 px de ancho en proporción 9:5, y menos que eso se vería borroso
MIN_ANCHO, MIN_ALTO = 1080, 608
MAX_LADO = 8000
MAX_PIXELES = 40_000_000  # freno a las bombas de descompresión: un archivo chico que al abrirse ocupa gigas
ZOOM_MIN, ZOOM_MAX = 1, 3


def validar_dimensiones(ancho, alto):
    """Las medidas (en px) de la foto original: ni menores que el héroe del flyer ni enormes."""
    if ancho < MIN_ANCHO or alto < MIN_ALTO:
        raise ReglaDeNegocio(f'La foto mide {ancho} × {alto} px y el mínimo es {MIN_ANCHO} × {MIN_ALTO} px: en el flyer se vería borrosa.')
    if ancho > MAX_LADO or alto > MAX_LADO or ancho * alto > MAX_PIXELES:
        raise ReglaDeNegocio(
            f'La foto mide {ancho} × {alto} px y el máximo es {MAX_LADO} × {MAX_LADO} px y {MAX_PIXELES // 1_000_000} megapíxeles.')


def _entre(valor, nombre, minimo, maximo):
    # nan e inf no entran: ninguna comparación con nan es verdadera
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not minimo <= valor <= maximo:
        raise ReglaDeNegocio(f'{nombre} tiene que ser un número entre {minimo} y {maximo}.')
    return round(float(valor), 2)


def validar_encuadre(foco_x, foco_y, zoom):
    """El encuadre de la foto en el héroe del flyer, con dos decimales: el foco (el punto de la foto que queda al centro,
    de 0 a 100 % en cada eje) y el zoom (de 1 a 3 veces)."""
    return (_entre(foco_x, 'El foco horizontal', 0, 100), _entre(foco_y, 'El foco vertical', 0, 100),
            _entre(zoom, 'El zoom', ZOOM_MIN, ZOOM_MAX))


def _ficha(equipo):
    return {'id_equipo': equipo['id_equipo'], 'nombre_equipo': equipo['nombre_equipo'], 'url_logo': equipo['url_logo']}


def _lados(llave):
    """(ganador, perdedor) de una llave jugada."""
    local, visitante = llave['local'], llave['visitante']
    return (local, visitante) if local['id_equipo'] == llave['ganador'] else (visitante, local)


def _partido(llave, id_equipo):
    """El partido que definió el puesto, visto desde ``id_equipo``."""
    p = llave['partido']
    ml, mv = marcador_efectivo(p['estado'], p['marcador_local'], p['marcador_visitante'])
    es_local = p['id_equipo_local'] == id_equipo
    rival = llave['visitante'] if es_local else llave['local']
    return {
        'ronda': llave['ronda'],
        'fecha': p['fecha'],
        'propio': ml if es_local else mv,
        'rival': mv if es_local else ml,
        'wo': p['estado'] == 'finalizado_wo',
        'equipo_rival': _ficha(rival),
    }


def _de_llaves(llaves):
    """[(lugar, equipo, partido)] de los puestos ya definidos por las llaves; vacío si la final no se jugó."""
    jugadas = {l['codigo']: l for l in llaves if l['estado'] == 'finalizado'}
    final = jugadas.get('F')
    if not final:
        return []
    campeon, vice = _lados(final)
    puestos = [(1, campeon, final), (2, vice, final)]
    if '3P' in jugadas:
        puestos.append((3, _lados(jugadas['3P'])[0], jugadas['3P']))
    elif 'R' in jugadas:
        puestos.append((3, _lados(jugadas['R'])[1], jugadas['R']))
    return [(lugar, _ficha(equipo), _partido(llave, equipo['id_equipo'])) for lugar, equipo, llave in puestos]


def final_de(llaves):
    """La final jugada de la categoría: ``{id_partido, ronda, fecha, campeon, vice}`` con cada equipo y su marcador.
    None si no hay llave ``F`` jugada o se definió por W.O.: sin un partido de verdad no hay estadísticas ni a quién premiar."""
    llave = next((l for l in llaves if l['codigo'] == 'F' and l['estado'] == 'finalizado'), None)
    if llave is None or llave['partido']['estado'] == 'finalizado_wo':
        return None
    p = llave['partido']
    marcador = {p['id_equipo_local']: p['marcador_local'], p['id_equipo_visitante']: p['marcador_visitante']}
    campeon, vice = _lados(llave)
    return {
        'id_partido': p['id_partido'], 'ronda': llave['ronda'], 'fecha': p['fecha'],
        'campeon': {**_ficha(campeon), 'marcador': marcador[campeon['id_equipo']]},
        'vice': {**_ficha(vice), 'marcador': marcador[vice['id_equipo']]},
    }


def podio(estado, partidos, tabla=None):
    """Los puestos del podio de una categoría, del 1 al 3 (lista vacía si todavía no hay podio).

    ``estado``: el de ``llaves.estado_fase_final``. ``partidos``: los finalizados de la categoría en todo el torneo,
    como tuplas para ``calcular_tabla``. ``tabla``: las filas con equipo de la tabla de posiciones; solo cuenta sin
    formato de llaves, con un grupo único y algún partido jugado (quien llama la pasa solo si el torneo terminó).
    """
    if estado['formato']:
        puestos = _de_llaves(estado['llaves'])
    elif tabla and all(f['grupo'] is None for f in tabla) and any(f['PJ'] for f in tabla):
        puestos = [(f['posicion'], _ficha(f), None) for f in tabla[:3]]
    else:
        return []
    totales = {f['id_equipo']: f for f in calcular_tabla(partidos)}
    maximo = max((f['PF'] for f in totales.values()), default=0)
    salida = []
    for lugar, equipo, partido in puestos:
        t = totales.get(equipo['id_equipo'], dict.fromkeys(TOTALES, 0))
        sellos = [nombre for nombre, cumple in (
            ('invicto', t['PJ'] > 0 and t['PP'] == 0),
            ('mas_puntos', maximo > 0 and t['PF'] == maximo),
        ) if cumple]
        salida.append({'lugar': lugar, 'equipo': equipo, **{k: t[k] for k in TOTALES}, 'sellos': sellos, 'partido': partido})
    return salida
