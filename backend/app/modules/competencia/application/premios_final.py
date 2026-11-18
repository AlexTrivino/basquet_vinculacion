"""Casos de uso de los premios de la final: el MVP y el mejor defensa de cada categoría.

Reciben el repositorio (RepositorioPartidos), la unidad de trabajo y, los que tocan archivos, el almacén
(``shared.infrastructure.almacenamiento``) y ``imagenes`` (``shared.infrastructure.imagenes``): quien llama los pasa,
porque esta capa no importa infraestructura. La foto es del premiado y se rige por las mismas reglas de la del podio.
"""
from io import BytesIO

from app.modules.competencia.application import fase_final
from app.modules.competencia.domain import podio, premios
from app.shared.domain.errores import NoEncontrado, ReglaDeNegocio

CARPETA = 'premios'
SIN_FINAL = 'La final de esta categoría todavía no se juega o se definió por W.O.: no hay jugadores que premiar.'
SIN_PREMIO = 'Elige primero al jugador de este premio.'
SIN_FOTO = 'Este premio no tiene foto.'


def _de_la_final(categoria, repositorio):
    """(final, candidatos) de la categoría; (None, None) si no tiene la final jugada (sin formato de llaves no hay final)."""
    llaves = fase_final.estado(categoria, repositorio)['llaves'] if categoria.formato else []
    final = podio.final_de(llaves)
    if final is None:
        return None, None
    ids_equipos = [final['campeon']['id_equipo'], final['vice']['id_equipo']]
    jugadores = repositorio.jugadores_del_partido(final['id_partido'], categoria.id_torneo, ids_equipos)
    return final, premios.candidatos(final, jugadores)


def _vigente(premio, candidatos):
    """El premio guardado, si su jugador sigue entre los candidatos: si se corrigió la final y ya no lo es, no cuenta."""
    return premio if premio and any(f['jugador']['id_jugador'] == premio['id_jugador'] for f in candidatos) else None


def _con_final(id_categoria, repositorio):
    """(categoría, candidatos) de una categoría con la final jugada; 404 si no existe o su torneo no está vigente."""
    categoria = fase_final.buscar_categoria(id_categoria, repositorio)
    if repositorio.torneo(categoria.id_torneo) is None:
        raise NoEncontrado('Torneo no encontrado.')
    final, candidatos = _de_la_final(categoria, repositorio)
    if final is None:
        raise ReglaDeNegocio(SIN_FINAL)
    return categoria, candidatos


def premios_del_torneo(id_torneo, repositorio):
    """Cada categoría del torneo con la final jugada: la final, sus candidatos y los premios que el admin ya eligió."""
    torneo = repositorio.torneo(id_torneo)
    if torneo is None:
        raise NoEncontrado('Torneo no encontrado.')
    salida = []
    for categoria, nombre, genero in repositorio.categorias_del_torneo(id_torneo):
        final, candidatos = _de_la_final(categoria, repositorio)
        if final is None:
            continue
        elegidos = repositorio.premios_final(categoria.id_categoria)
        salida.append({
            'categoria': {'id_categoria': categoria.id_categoria, 'nombre_categoria': nombre, 'genero_categoria': genero},
            'final': final,
            'candidatos': candidatos,
            'premios': {tipo: _vigente(elegidos.get(tipo), candidatos[tipo]) for tipo in premios.TIPOS},
        })
    return {'torneo': torneo, 'premios': salida}


def elegir_jugador(id_categoria, tipo, id_jugador, *, repositorio, almacen, unidad):
    """Guarda al jugador del premio (lo crea o cambia de jugador) y devuelve el premio. Cambiar de jugador borra la
    foto, el archivo incluido: era del anterior. ``id_jugador`` tiene que ser un candidato de la final."""
    _, candidatos = _con_final(id_categoria, repositorio)
    premios.validar_jugador(tipo, id_jugador, candidatos)
    anterior = repositorio.elegir_premiado(id_categoria, tipo, id_jugador)
    unidad.confirmar()
    if anterior:
        almacen.borrar_en_segundo_plano(anterior)
    return repositorio.premios_final(id_categoria)[tipo]


def subir_foto(id_categoria, tipo, stream, validar, *, repositorio, almacen, imagenes, unidad):
    """Guarda la foto del premiado, o reemplaza la que tenía (el encuadre vuelve a 50 / 50 / 1 y el archivo anterior se
    borra del bucket), y devuelve el premio. Hay que haber elegido antes al jugador. ``validar(stream)`` lanza
    ValueError si el tipo real o el peso no sirven; ``imagenes`` lanza ValueError si no se puede leer, y las medidas
    ReglaDeNegocio."""
    categoria, candidatos = _con_final(id_categoria, repositorio)
    premio = _vigente(repositorio.premios_final(id_categoria).get(tipo), candidatos[tipo])
    if premio is None:
        raise ReglaDeNegocio(SIN_PREMIO)
    validar(stream)
    podio.validar_dimensiones(*imagenes.medir(stream))
    datos, ancho, alto = imagenes.normalizar(stream)  # la foto que se guarda: derecha, sin EXIF y de 2560 px como máximo
    url = almacen.subir_archivo(BytesIO(datos), f'{tipo}-{premio["id_jugador"]}.webp', f'{CARPETA}/{categoria.id_torneo}/{id_categoria}', 'image/webp')
    anterior = repositorio.guardar_foto_premio(id_categoria, tipo, url, ancho, alto)
    unidad.confirmar()
    if anterior:
        almacen.borrar_en_segundo_plano(anterior)
    return repositorio.premios_final(id_categoria)[tipo]


def ajustar_encuadre(id_categoria, tipo, foco_x, foco_y, zoom, *, repositorio, unidad):
    """Cambia el encuadre de la foto (el archivo queda intacto) y devuelve el premio."""
    premio = repositorio.premios_final(id_categoria).get(tipo)
    if premio is None or premio['foto'] is None:
        raise NoEncontrado(SIN_FOTO)
    foco_x, foco_y, zoom = podio.validar_encuadre(foco_x, foco_y, zoom)
    repositorio.ajustar_foto_premio(id_categoria, tipo, foco_x, foco_y, zoom)
    unidad.confirmar()
    return repositorio.premios_final(id_categoria)[tipo]


def quitar_foto(id_categoria, tipo, *, repositorio, almacen, unidad):
    """Borra la foto y su archivo (el premio sigue con su jugador); no pide que el jugador siga siendo candidato, para
    poder limpiar tras una corrección."""
    url = repositorio.borrar_foto_premio(id_categoria, tipo)
    if url is None:
        raise NoEncontrado(SIN_FOTO)
    unidad.confirmar()
    almacen.borrar_en_segundo_plano(url)
    return repositorio.premios_final(id_categoria)[tipo]
