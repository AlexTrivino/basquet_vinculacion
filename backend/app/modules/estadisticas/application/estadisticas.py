"""Casos de uso de estadísticas. Reciben el repositorio (RepositorioEstadisticas) y, la carga, también la unidad
(confirmar). Quien carga llega como ``rol``."""
from app.modules.estadisticas.domain.estadisticas import JUGADOS, lideres as primeros, validar_carga, validar_jugadores_propios
from app.shared.domain.errores import NoEncontrado, ReglaDeNegocio


def publicas(repositorio):
    """Los puntos anotados de la portada: en total y por torneo."""
    por_torneo = repositorio.puntos_por_torneo()
    return {'puntos_totales': int(sum(por_torneo.values())), 'puntos_por_torneo': {str(t): int(p) for t, p in por_torneo.items()}}


def tablero(repositorio):
    """Los contadores del panel del super_admin."""
    return repositorio.contadores()


def actividad_reciente(repositorio):
    return repositorio.actividad_reciente()


def lideres(id_torneo, id_categoria, repositorio):
    """(nombre del torneo, los primeros de cada rubro) de un torneo vigente, en una categoría o en todas."""
    nombre = repositorio.nombre_del_torneo(id_torneo)
    if nombre is None:
        raise NoEncontrado('Torneo no encontrado.')
    return nombre, primeros(repositorio.totales_por_jugador(id_torneo, id_categoria))


def flyers(id_torneo, fecha, repositorio):
    """Los resultados de ``fecha`` (por defecto, la última con partidos jugados) con su figura y las figuras del torneo."""
    datos = repositorio.flyers(id_torneo, fecha)
    if datos is None:
        raise NoEncontrado('El torneo no existe.')
    return datos


def figuras_en_curso(repositorio):
    """La figura acumulada de cada categoría de los torneos en curso (la de los flyers: la mayor valoración hasta
    hoy), con su torneo."""
    figuras = []
    for id_torneo in repositorio.torneos_en_curso():
        # ponytail: arma el flyer completo de cada torneo en curso; una consulta propia si la portada llega a pesar
        datos = repositorio.flyers(id_torneo)
        figuras += [{**figura, 'torneo': datos['torneo']} for figura in datos['figuras_categoria']]
    return figuras


def planilla(id_partido, repositorio):
    """La planilla oficial de un partido terminado."""
    partido = repositorio.planilla(id_partido)
    if partido is None:
        raise NoEncontrado('El partido especificado no existe.')
    if partido.estado not in JUGADOS:
        raise ReglaDeNegocio(f'Solo se puede generar planilla de partidos finalizados. Estado actual: "{partido.estado}".')
    return partido


def cargar(datos, rol, hoy, *, repositorio, unidad):
    """Las estadísticas de los jugadores de un equipo en un partido, todo junto: reemplaza las que ya tenían y
    registra como activas, con la fecha de ``hoy``, las sanciones que vengan. Solo el super_admin."""
    if rol != 'super_admin':
        raise ReglaDeNegocio('Solo los administradores del sistema pueden registrar estadísticas de partidos.')
    id_partido, id_equipo, jugadores = datos['id_partido'], datos['id_equipo'], datos['estadisticas_jugadores']
    partido = repositorio.partido_para_carga(id_partido)
    if partido is None:
        raise ReglaDeNegocio('El partido especificado no existe.')
    validar_carga(partido, id_equipo, sum(j['puntos'] for j in jugadores))
    enviados = {j['id_jugador'] for j in jugadores}
    validar_jugadores_propios(enviados, repositorio.en_plantilla(id_equipo, partido.id_torneo, enviados))
    repositorio.reemplazar_lineas(id_partido, jugadores)
    sancionados = [(j['id_jugador'], j['sancion_tipo']) for j in jugadores if j.get('sancion_tipo') is not None]
    if sancionados:
        repositorio.agregar_sanciones(id_partido, sancionados, hoy)
    repositorio.marcar_procesadas(id_partido, local=id_equipo == partido.id_equipo_local)
    unidad.confirmar()
    return {'estadisticas_insertadas': len(jugadores), 'sanciones_insertadas': len(sancionados), 'id_partido': id_partido, 'id_equipo': id_equipo}
