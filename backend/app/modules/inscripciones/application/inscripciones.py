"""Casos de uso de inscripciones. Cada uno recibe sus piezas por parámetro:

- repositorio: RepositorioInscripciones; su ``obtener`` devuelve la inscripción con su torneo, equipo y categoría.
- almacen: subir_archivo(stream, nombre, carpeta, mime) -> url y borrar_archivo(url).
- unidad: confirmar() y revertir().
Quien pide llega como ``id_usuario`` y ``rol``.
"""
from datetime import timedelta

from app.modules.inscripciones.domain.inscripcion import (
    RECHAZADO, validar_club_nuevo, validar_envio, validar_equipo_para_inscribir, validar_retiro,
    validar_torneo_para_inscribir, validar_un_borrador,
)
from app.shared.domain.errores import Conflicto, NoEncontrado, ReglaDeNegocio, SinPermiso
from app.shared.domain.textos import normalizar_mayusculas


def listar_publicas(pagina, por_pagina, repositorio, id_torneo=None, id_equipo=None):
    """(inscripciones aprobadas, metadatos), de la más reciente a la más antigua."""
    return repositorio.listar(pagina, por_pagina, id_torneo=id_torneo, id_equipo=id_equipo, estado='aprobado')


def listar(pagina, por_pagina, id_usuario, rol, repositorio, **filtros):
    """(inscripciones, metadatos, completo). Un delegado ve las de sus equipos activos, también los borradores; el
    super_admin, todas salvo los borradores (a menos que los pida) y completas. Filtros: id_torneo, estado,
    id_categoria e id_equipo."""
    delegado = rol == 'delegado'
    inscripciones, meta = repositorio.listar(pagina, por_pagina, incluir_borradores=delegado,
                                             id_delegado=id_usuario if delegado else None, **filtros)
    return inscripciones, meta, rol == 'super_admin'


def obtener(id_inscripcion, repositorio):
    inscripcion = repositorio.obtener(id_inscripcion)
    if inscripcion is None:
        raise NoEncontrado('Inscripción no encontrada.')
    return inscripcion


def para_gestionar(id_inscripcion, id_usuario, rol, mensaje, repositorio):
    """La inscripción, si quien pide puede gestionarla: el super_admin siempre; un delegado, si el equipo es suyo.
    Si no, SinPermiso con ``mensaje``."""
    inscripcion = obtener(id_inscripcion, repositorio)
    if rol == 'delegado' and (inscripcion.equipo is None or inscripcion.equipo.id_usuario != id_usuario):
        raise SinPermiso(mensaje)
    return inscripcion


def crear(datos, *, repositorio, unidad):
    """Inscribe un equipo activo en una categoría de un torneo programado. Como hoy, toda alta revisa el borrador
    abierto del dueño del equipo, aunque la nueva entre como pendiente."""
    validar_torneo_para_inscribir(repositorio.estado_del_torneo(datos['id_torneo']))
    equipo = repositorio.equipo(datos['id_equipo'])
    validar_equipo_para_inscribir(equipo)
    validar_un_borrador(repositorio.borradores_de(equipo.id_usuario))
    try:
        id_inscripcion = repositorio.agregar(datos)
        unidad.confirmar()
    except Conflicto:
        unidad.revertir()
        raise Conflicto('El equipo ya está inscrito en esta categoría para el torneo especificado. '
                        'No se permiten inscripciones duplicadas.') from None
    return repositorio.obtener(id_inscripcion)


def reinscribir(datos, clonar_plantilla, *, repositorio, unidad):
    """Inscribe en borrador un equipo que ya jugó; con ``clonar_plantilla``, copia la plantilla de su inscripción
    más reciente en otro torneo (salvo los jugadores que ya están en este torneo)."""
    inscripcion = crear({**datos, 'estado_inscripcion': 'borrador'}, repositorio=repositorio, unidad=unidad)
    anterior = repositorio.anterior_en_otro_torneo(datos['id_equipo'], datos['id_torneo']) if clonar_plantilla else None
    if anterior:
        for id_jugador, numero_camiseta in repositorio.plantilla_de(datos['id_equipo'], *anterior):
            if not repositorio.juega_en(id_jugador, datos['id_torneo']):
                repositorio.agregar_a_plantilla(numero_camiseta=numero_camiseta, id_jugador=id_jugador, id_torneo=datos['id_torneo'],
                                                id_equipo=datos['id_equipo'], id_categoria=datos['id_categoria'], estado='activo')
        unidad.confirmar()
    return repositorio.obtener(inscripcion.id_inscripcion)


def _borrar(id_inscripcion, repositorio, almacen):
    """La cascada de una inscripción y sus archivos de Storage; devuelve si se borró el equipo."""
    archivos, equipo_borrado = repositorio.borrar(id_inscripcion)
    for url in archivos:
        almacen.borrar_archivo(url)
    return equipo_borrado


def cambiar_estado(id_inscripcion, estado, *, repositorio, almacen, unidad):
    """Guarda el nuevo estado y devuelve la inscripción; rechazarla la borra con su equipo y sus jugadores nuevos
    (devuelve None)."""
    obtener(id_inscripcion, repositorio)
    if estado == RECHAZADO:
        _borrar(id_inscripcion, repositorio, almacen)
        unidad.confirmar()
        return None
    repositorio.actualizar(id_inscripcion, {'estado_inscripcion': estado})
    unidad.confirmar()
    return repositorio.obtener(id_inscripcion)


def editar(id_inscripcion, id_torneo, id_categoria, *, repositorio, unidad):
    """Pasa la inscripción y la plantilla del equipo a otro torneo programado y otra categoría, si el torneo actual
    no empezó ni terminó."""
    inscripcion = repositorio.obtener(id_inscripcion)
    if inscripcion is None:
        raise NoEncontrado('Inscripción no encontrada.')
    if inscripcion.torneo.estado in ('en_curso', 'finalizado'):
        raise ReglaDeNegocio('No se puede editar una inscripción de un torneo que está en curso o finalizado.')
    estado_nuevo = repositorio.estado_del_torneo(id_torneo)
    if estado_nuevo is None:
        raise NoEncontrado('El nuevo torneo no existe.')
    if estado_nuevo != 'programado':
        raise ReglaDeNegocio('Solo se puede cambiar la inscripción a un torneo en estado programado.')
    if not repositorio.existe_categoria(id_categoria):
        raise NoEncontrado('La nueva categoría no existe.')
    duplicada = repositorio.buscar(id_torneo, inscripcion.id_equipo, id_categoria)
    if duplicada is not None and duplicada != id_inscripcion:
        raise Conflicto('El equipo ya está inscrito en el torneo y categoría seleccionados.')
    repositorio.actualizar(id_inscripcion, {'id_torneo': id_torneo, 'id_categoria': id_categoria})
    repositorio.mover_plantilla(inscripcion.id_equipo, (inscripcion.id_torneo, inscripcion.id_categoria), (id_torneo, id_categoria))
    unidad.confirmar()
    return repositorio.obtener(id_inscripcion)


def eliminar_borrador(id_inscripcion, id_usuario, *, repositorio, almacen, unidad):
    """Un delegado borra su inscripción en borrador, con la misma cascada que el rechazo."""
    inscripcion = repositorio.obtener(id_inscripcion)
    if inscripcion is None or inscripcion.equipo is None or inscripcion.equipo.id_usuario != id_usuario:
        raise NoEncontrado('No se encontró la inscripción o no tienes permisos sobre ella.')
    if inscripcion.estado_inscripcion != 'borrador':
        raise ReglaDeNegocio('Solo puedes eliminar inscripciones que se encuentren en estado de borrador.')
    _borrar(id_inscripcion, repositorio, almacen)
    unidad.confirmar()


def retirar(id_inscripcion, *, repositorio, unidad):
    """Un equipo aprobado deja el torneo: su inscripción pasa a 'retirado' y se borran sus partidos programados del
    torneo. Las estadísticas y los partidos jugados se quedan."""
    inscripcion = obtener(id_inscripcion, repositorio)
    validar_retiro(inscripcion.estado_inscripcion)
    repositorio.actualizar(id_inscripcion, {'estado_inscripcion': 'retirado'})
    repositorio.borrar_partidos_programados(inscripcion.id_torneo, inscripcion.id_equipo)
    unidad.confirmar()
    return repositorio.obtener(id_inscripcion)


def subir_comprobante(id_inscripcion, stream, nombre, mime, *, repositorio, almacen, unidad):
    """Guarda el comprobante de pago y devuelve su URL. Como hoy, el anterior se queda en Storage."""
    url = almacen.subir_archivo(stream, nombre, f'inscripciones/{id_inscripcion}', mime)
    repositorio.actualizar(id_inscripcion, {'url_comprobante_pago': url})
    unidad.confirmar()
    return url


def crear_completa(nombre_equipo, id_torneo, id_categoria, comprobante, logo, id_usuario, *, repositorio, almacen, unidad):
    """Abre el club del delegado con su inscripción en borrador, el comprobante y, si viene, el logo; todo o nada:
    si algo falla después del cupo, se revierte y se borra de Storage lo que ya se subió.

    ``comprobante`` y ``logo``: (stream, nombre, mime); ``logo`` puede ser None. El torneo y la categoría llegan
    como texto del formulario: como hoy, si no son número, falla aquí, después de revisar el cupo.
    """
    validar_club_nuevo(repositorio.equipos_activos_de(id_usuario), repositorio.borradores_de(id_usuario))
    subidos = []
    try:
        nombre = normalizar_mayusculas({'nombre_equipo': nombre_equipo}, ['nombre_equipo'])['nombre_equipo']
        id_equipo = repositorio.agregar_equipo(nombre, id_usuario)
        id_inscripcion = repositorio.agregar({'id_torneo': int(id_torneo), 'id_equipo': id_equipo,
                                              'id_categoria': int(id_categoria), 'estado_inscripcion': 'borrador'})
        stream, nombre_archivo, mime = comprobante
        subidos.append(almacen.subir_archivo(stream, nombre_archivo, f'inscripciones/{id_inscripcion}', mime))
        repositorio.actualizar(id_inscripcion, {'url_comprobante_pago': subidos[-1]})
        if logo:
            stream, nombre_archivo, mime = logo
            subidos.append(almacen.subir_archivo(stream, nombre_archivo, f'equipos/{id_equipo}/logo', mime))
            repositorio.actualizar_equipo(id_equipo, {'url_logo': subidos[-1]})
        unidad.confirmar()
    except Exception:
        unidad.revertir()
        for url in subidos:
            try:
                almacen.borrar_archivo(url)
            except Exception:
                pass  # se sigue aunque no se pueda borrar
        raise
    return repositorio.obtener(id_inscripcion)


def enviar_a_revision(id_inscripcion, id_usuario, rol, *, repositorio, unidad):
    """Un borrador (o una pendiente) con comprobante y una plantilla válida pasa a 'pendiente'."""
    inscripcion = para_gestionar(id_inscripcion, id_usuario, rol, 'No tienes permiso para gestionar esta inscripción.', repositorio)
    validar_envio(inscripcion.estado_inscripcion, inscripcion.url_comprobante_pago,
                  repositorio.dorsales_activos(inscripcion.id_equipo, inscripcion.id_torneo))
    repositorio.actualizar(id_inscripcion, {'estado_inscripcion': 'pendiente'})
    unidad.confirmar()
    return repositorio.obtener(id_inscripcion)


def purgar_expiradas(dias, ahora, *, repositorio, almacen, unidad):
    """Borra, con la cascada del rechazo, los borradores y rechazos sin movimiento en ``dias`` días."""
    expiradas = repositorio.expiradas(ahora - timedelta(days=dias))
    equipos_eliminados = sum(_borrar(id_inscripcion, repositorio, almacen) for id_inscripcion in expiradas)
    if expiradas:
        unidad.confirmar()
    return {'inscripciones_purgadas': len(expiradas), 'equipos_eliminados': equipos_eliminados, 'dias_umbral': dias}
