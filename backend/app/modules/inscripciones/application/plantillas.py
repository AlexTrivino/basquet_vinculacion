"""Casos de uso de la plantilla (la nómina de un equipo en un torneo). Cada uno recibe sus piezas por parámetro:

- repositorio: RepositorioPlantillas; su ``obtener`` devuelve solo entradas activas, con su jugador.
- unidad: confirmar() y revertir().
Quien pide llega como ``id_usuario`` y ``rol``.
"""
from app.modules.inscripciones.domain.plantilla import edad_deportiva, validar_cupo_de_plantilla, validar_edad
from app.shared.domain.errores import Conflicto, NoEncontrado, ReglaDeNegocio, SinPermiso


def listar(pagina, por_pagina, repositorio, **filtros):
    """(entradas activas, metadatos), por dorsal. Filtros: id_equipo, id_torneo e id_categoria."""
    return repositorio.listar(pagina, por_pagina, **filtros)


def obtener(id_plantilla, repositorio):
    entrada = repositorio.obtener(id_plantilla)
    if entrada is None:
        raise NoEncontrado('Entrada de plantilla no encontrada.')
    return entrada


def para_gestionar(id_plantilla, id_usuario, rol, repositorio):
    """La entrada, si quien pide puede cambiarla: el super_admin siempre; un delegado, si el equipo es suyo."""
    entrada = obtener(id_plantilla, repositorio)
    if rol == 'delegado' and entrada.dueno != id_usuario:
        raise SinPermiso('No tienes permiso para modificar la plantilla de este equipo.')
    return entrada


def agregar_jugador(datos, id_usuario, rol, hoy, *, repositorio, unidad):
    """Agrega un jugador a la plantilla de un equipo con inscripción vigente en esa categoría del torneo.

    En orden: un delegado, solo a su equipo y no con el torneo en curso; el equipo inscrito; lugar en la plantilla;
    el jugador activo; su edad deportiva dentro de la categoría; que no juegue ya la categoría en el torneo; y un
    dorsal libre en el equipo y la categoría.
    """
    if rol == 'delegado' and repositorio.dueno_del_equipo(datos['id_equipo']) != id_usuario:
        raise SinPermiso('No tienes permiso para agregar jugadores a este equipo.')
    if rol == 'delegado' and repositorio.estado_del_torneo(datos['id_torneo']) == 'en_curso':
        raise ReglaDeNegocio('El torneo está en curso. Para solicitar cambios en la plantilla, comunícate con la administración.')
    categoria = repositorio.categoria_inscrita(datos['id_equipo'], datos['id_torneo'], datos['id_categoria'])
    if categoria is None:
        raise ReglaDeNegocio('El equipo no tiene una inscripción válida o en proceso para este torneo. '
                             'No se pueden agregar jugadores si la inscripción fue rechazada o no existe.')
    validar_cupo_de_plantilla(repositorio.activos_en(datos['id_equipo'], datos['id_torneo'], datos['id_categoria']))
    jugador = repositorio.jugador(datos['id_jugador'])
    if jugador is None or jugador.estado == 'inactivo':
        raise ReglaDeNegocio('El jugador especificado no existe o está inactivo.')
    validar_edad(edad_deportiva(jugador.fecha_nacimiento, hoy), categoria)
    if repositorio.juega_la_categoria(datos['id_jugador'], datos['id_torneo'], categoria.id_categoria):
        raise Conflicto('El jugador ya está inscrito en esta categoría dentro del torneo. Solo puede participar una vez por categoría.')
    numero = datos.get('numero_camiseta')
    if numero is not None and repositorio.dorsal_ocupado(datos['id_equipo'], datos['id_torneo'], numero, id_categoria=datos['id_categoria']):
        raise Conflicto(f'El número de camiseta {numero} ya está en uso por otro jugador de este equipo en este torneo.')
    try:
        id_plantilla = repositorio.agregar(datos)
        unidad.confirmar()
    except Conflicto:
        unidad.revertir()
        raise Conflicto('No se pudo agregar al jugador por un conflicto de datos. '
                        'Verifique que el jugador no esté ya registrado en esta plantilla.') from None
    return repositorio.obtener(id_plantilla)


def cambiar_dorsal(id_plantilla, numero, *, repositorio, unidad):
    """Cambia el dorsal de una entrada activa si ningún otro jugador del equipo lo usa en el torneo."""
    entrada = obtener(id_plantilla, repositorio)
    if numero is not None and repositorio.dorsal_ocupado(entrada.id_equipo, entrada.id_torneo, numero, salvo=id_plantilla):
        raise Conflicto(f'El número de camiseta {numero} ya está en uso por otro jugador de este equipo en este torneo.')
    repositorio.actualizar(id_plantilla, {'numero_camiseta': numero})
    unidad.confirmar()
    return repositorio.obtener(id_plantilla)


def remover(id_plantilla, id_usuario, rol, *, repositorio, unidad):
    """Baja lógica de una entrada activa; el jugador se queda para jugar en otros equipos."""
    para_gestionar(id_plantilla, id_usuario, rol, repositorio)
    repositorio.actualizar(id_plantilla, {'estado': 'inactivo'})
    unidad.confirmar()
