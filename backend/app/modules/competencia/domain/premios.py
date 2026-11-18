"""Premios de la final (el MVP y el mejor defensa), en Python puro.

Los dos salen del partido de la final de la categoría y los elige el admin entre los jugadores con estadísticas cargadas
en él: el MVP, entre los del equipo campeón; el mejor defensa, entre los de los dos finalistas. El sistema solo ordena a
los candidatos de mejor a peor: el primero es el que sugiere. No siempre el MVP es el de mejor valoración, por eso elige el admin.
"""
from app.shared.domain.errores import ReglaDeNegocio

TIPOS = ('mvp', 'defensa')
RECHAZOS = {
    'mvp': 'El MVP tiene que ser un jugador del equipo campeón con estadísticas cargadas en la final.',
    'defensa': 'El mejor defensa tiene que ser un jugador de la final con estadísticas cargadas.',
}


def valoracion(linea):
    """Puntos + rebotes + asistencias + tapones: la misma que registra el módulo de estadísticas y usan los flyers de figuras."""
    return linea['puntos'] + linea['rebotes'] + linea['asistencias'] + linea['tapones']


def _figura(j, equipo):
    """Un candidato con la forma de una figura de los flyers (jugador, equipo, línea y valoración): el frontend le aplica las mismas piezas."""
    linea = {c: j[c] for c in ('puntos', 'rebotes', 'asistencias', 'tapones', 'triples', 'tiros_libres')}
    return {
        'jugador': {'id_jugador': j['id_jugador'], 'nombre': j['nombre'], 'url_foto': j['url_foto'], 'numero_camiseta': j['dorsal']},
        'equipo': equipo,
        'categoria': None,
        'linea': linea,
        'valoracion': valoracion(linea),
    }


def _por_valoracion(figura):
    return figura['valoracion'], figura['linea']['puntos']


def _por_defensa(figura):
    linea = figura['linea']
    return linea['rebotes'] + linea['tapones'], linea['tapones'], figura['valoracion']


def candidatos(final, jugadores):
    """``{'mvp': [...], 'defensa': [...]}``: cada lista de mejor a peor (en empate, por nombre) y el primero es el sugerido.

    ``final``: la de ``podio.final_de``. ``jugadores``: los que tienen estadísticas en ese partido, con ``id_equipo``,
    ``dorsal``, ``nombre``, ``url_foto`` y sus números (puntos, rebotes, asistencias, tapones, triples y tiros_libres).
    Quien no es de uno de los dos finalistas no cuenta.
    """
    equipos = {final[lado]['id_equipo']: {k: final[lado][k] for k in ('id_equipo', 'nombre_equipo', 'url_logo')} for lado in ('campeon', 'vice')}
    figuras = sorted((_figura(j, equipos[j['id_equipo']]) for j in jugadores if j['id_equipo'] in equipos), key=lambda f: f['jugador']['nombre'])
    del_campeon = [f for f in figuras if f['equipo']['id_equipo'] == final['campeon']['id_equipo']]
    # sorted es estable aun con reverse: los empates quedan en el orden de los nombres
    return {'mvp': sorted(del_campeon, key=_por_valoracion, reverse=True), 'defensa': sorted(figuras, key=_por_defensa, reverse=True)}


def validar_jugador(tipo, id_jugador, candidatos):
    """El jugador tiene que ser uno de los candidatos del premio (``candidatos``: el de esta misma función)."""
    ids = {f['jugador']['id_jugador'] for f in candidatos[tipo]}
    if isinstance(id_jugador, bool) or not isinstance(id_jugador, int) or id_jugador not in ids:
        raise ReglaDeNegocio(RECHAZOS[tipo])
