"""Casos de uso de jugadores, de su perfil y del buscador del visor. Cada uno recibe sus piezas por parámetro:

- repositorio: RepositorioJugadores; su ``obtener`` devuelve al jugador en cualquier estado.
- almacen: subir_archivo(stream, nombre, carpeta, mime) -> url y borrar_en_segundo_plano(url).
- unidad: confirmar() y revertir().
Quien pide llega como ``id_usuario`` y ``rol`` (None y None si es anónimo).
"""
from app.modules.plantel.domain.jugador import (
    EN_MAYUSCULAS, CedulaRepetida, delegado_puede_gestionar, puede_ver_privados, sin_privados,
)
from app.shared.domain.errores import Conflicto, NoEncontrado, SinPermiso
from app.shared.domain.textos import normalizar_mayusculas

DOCUMENTOS = {'foto': ('url_foto', 'fotos'), 'cedula': ('url_cedula', 'cedulas'), 'acta': ('url_acta_bachiller', 'actas')}


def listar(pagina, por_pagina, rol, repositorio, **filtros):
    """(jugadores, metadatos, completo). Solo el super_admin ve el listado completo: los inactivos, los datos
    personales y la búsqueda por cédula, que para el resto sería un oráculo cédula → nombre.

    Filtros: search, id_torneo, id_equipo, id_categoria, genero y estado.
    """
    completo = rol == 'super_admin'
    if not completo:
        filtros['estado'] = 'activo'
    jugadores, meta = repositorio.listar(pagina, por_pagina, buscar_por_cedula=completo, detalle=completo, **filtros)
    return jugadores, meta, completo


def obtener(id_jugador, repositorio, incluir_inactivos=False):
    jugador = repositorio.obtener(id_jugador, detalle=True)
    if jugador is None or (jugador.estado == 'inactivo' and not incluir_inactivos):
        raise NoEncontrado('Jugador no encontrado.')
    return jugador


def ficha(id_jugador, id_usuario, rol, repositorio):
    """(jugador, completo): con sus datos personales para el super_admin o su delegado, aunque esté inactivo;
    para el resto, sin ellos y solo si está activo."""
    jugador = obtener(id_jugador, repositorio, incluir_inactivos=True)
    delegados = repositorio.delegados_del_jugador(id_jugador) if rol == 'delegado' else []
    if puede_ver_privados(rol, id_usuario, delegados):
        return jugador, True
    if jugador.estado != 'activo':
        raise NoEncontrado('Jugador no encontrado.')
    return jugador, False


def buscar_por_cedula(cedula, repositorio):
    """El jugador activo con esa cédula, o None."""
    return repositorio.por_cedula(cedula)


def para_gestionar(id_jugador, id_usuario, rol, mensaje, repositorio, incluir_inactivos=False):
    """El jugador, si quien pide puede gestionarlo: el super_admin siempre; un delegado, si el jugador está libre
    o juega en uno de sus equipos. Si no, SinPermiso con ``mensaje``."""
    jugador = obtener(id_jugador, repositorio, incluir_inactivos)
    if rol == 'delegado' and not delegado_puede_gestionar(id_usuario, repositorio.delegados_del_jugador(id_jugador)):
        raise SinPermiso(mensaje)
    return jugador


def crear(datos, *, repositorio, unidad):
    """Registra un jugador (nombre, cédula y teléfono en MAYÚSCULAS); si la cédula ya existe, CedulaRepetida
    con el jugador que la tiene."""
    datos = normalizar_mayusculas(dict(datos), EN_MAYUSCULAS)
    try:
        id_jugador = repositorio.agregar(datos)
        unidad.confirmar()
    except Conflicto:
        unidad.revertir()
        raise CedulaRepetida('Ya existe un jugador registrado con ese número de documento.',
                             repositorio.por_cedula(datos['documento_identificacion'], incluir_inactivos=True)) from None
    return repositorio.obtener(id_jugador, detalle=True)


def actualizar(id_jugador, cambios, *, repositorio, unidad):
    """Cambia los datos de un jugador. La autorización la revisa antes ``para_gestionar``."""
    cambios = normalizar_mayusculas(dict(cambios), EN_MAYUSCULAS)
    try:
        repositorio.actualizar(id_jugador, cambios)
        unidad.confirmar()
    except Conflicto:
        unidad.revertir()
        raise CedulaRepetida('Ya existe otro jugador registrado con ese número de documento.') from None
    return repositorio.obtener(id_jugador, detalle=True)


def dar_de_baja(id_jugador, *, repositorio, almacen, unidad):
    """Baja lógica de un jugador activo; su foto, su cédula y su acta se borran de Storage en segundo plano."""
    jugador = obtener(id_jugador, repositorio)
    repositorio.actualizar(id_jugador, {'estado': 'inactivo'})
    unidad.confirmar()
    for url in (jugador.url_foto, jugador.url_cedula, jugador.url_acta_bachiller):
        if url:
            almacen.borrar_en_segundo_plano(url)


def reemplazar_documento(id_jugador, tipo, stream, nombre, mime, *, repositorio, almacen, unidad):
    """Sube la foto, la cédula o el acta (``tipo``) de un jugador activo; la anterior se borra en segundo plano."""
    campo, carpeta = DOCUMENTOS[tipo]
    anterior = getattr(obtener(id_jugador, repositorio), campo)
    url = almacen.subir_archivo(stream, nombre, f'jugadores/{id_jugador}/{carpeta}', mime)
    jugador = actualizar(id_jugador, {campo: url}, repositorio=repositorio, unidad=unidad)
    if anterior:
        almacen.borrar_en_segundo_plano(anterior)
    return jugador


def perfil(id_jugador, id_usuario, rol, repositorio):
    """Perfil consolidado de un jugador activo; sin los datos personales salvo para el super_admin o su delegado."""
    perfil = repositorio.perfil(id_jugador)
    if not perfil:
        raise NoEncontrado('Jugador no encontrado.')
    if not puede_ver_privados(rol, id_usuario, perfil.get('delegados_autorizados') or []):
        perfil = sin_privados(perfil)
    return perfil


def buscar_para_visor(filtros, pagina, por_pagina, repositorio):
    """(tarjetas de jugadores activos, metadatos) para el buscador del visor, siempre sin datos personales."""
    return repositorio.buscar_para_visor(filtros, pagina, por_pagina)


def partidos_del_jugador(id_jugador, repositorio):
    """Partidos con planilla cargada de un jugador activo, del más reciente al más antiguo."""
    partidos = repositorio.partidos_para_visor(id_jugador)
    if partidos is None:
        raise NoEncontrado('Jugador no encontrado.')
    return partidos
