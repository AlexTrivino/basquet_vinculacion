"""Casos de uso de equipos. Cada uno recibe sus piezas por parámetro:

- repositorio: RepositorioEquipos; su ``obtener`` devuelve el equipo en cualquier estado.
- almacen: subir_archivo(stream, nombre, carpeta, mime) -> url y borrar_archivo(url).
- unidad: confirmar() y revertir().
Quien pide llega como ``id_usuario`` y ``rol``.
"""
from app.modules.plantel.domain.equipo import puede_gestionar, validar_cupo_de_equipos
from app.shared.domain.errores import Conflicto, NoEncontrado, ReglaDeNegocio, SinPermiso
from app.shared.domain.textos import normalizar_mayusculas

IMAGENES = {'logo': 'url_logo', 'banner': 'url_foto_equipo'}


def listar(pagina, por_pagina, repositorio):
    """(equipos activos de la página, metadatos), por nombre."""
    return repositorio.listar_activos(pagina, por_pagina)


def listar_para_administrar(pagina, por_pagina, repositorio, **filtros):
    """(equipos con su delegado y sus inscripciones, metadatos). Filtros: id_torneo, id_categoria, search y estado."""
    return repositorio.listar_para_administrar(pagina, por_pagina, **filtros)


def obtener(id_equipo, repositorio, incluir_inactivos=False):
    equipo = repositorio.obtener(id_equipo)
    if equipo is None or (equipo.estado == 'inactivo' and not incluir_inactivos):
        raise NoEncontrado('Equipo no encontrado.')
    return equipo


def para_gestionar(id_equipo, id_usuario, rol, repositorio):
    """El equipo activo, si quien pide puede gestionarlo (para revisar antes de leer el archivo)."""
    equipo = obtener(id_equipo, repositorio)
    if not puede_gestionar(equipo, id_usuario, rol):
        raise SinPermiso('No tienes permiso para modificar este equipo.')
    return equipo


def crear(datos, id_usuario, *, repositorio, unidad):
    """Registra un equipo a nombre de quien lo pide (también del super_admin), dentro de su cupo de equipos activos."""
    datos = normalizar_mayusculas(dict(datos), ['nombre_equipo'])
    validar_cupo_de_equipos(repositorio.activos_de(id_usuario))
    try:
        id_equipo = repositorio.agregar({**datos, 'id_usuario': id_usuario})
        unidad.confirmar()
    except Conflicto:
        unidad.revertir()
        raise Conflicto('Ya existe un equipo con ese nombre para este delegado.') from None
    return repositorio.obtener(id_equipo, detalle=True)


def actualizar(id_equipo, cambios, id_usuario, rol, *, repositorio, unidad):
    """Cambia el nombre o el estado de un equipo activo; un delegado, solo de los suyos."""
    equipo = obtener(id_equipo, repositorio)
    cambios = normalizar_mayusculas(dict(cambios), ['nombre_equipo'])
    if not puede_gestionar(equipo, id_usuario, rol):
        raise SinPermiso('No tienes permiso para modificar este equipo.')
    repositorio.actualizar(id_equipo, cambios)
    unidad.confirmar()
    return repositorio.obtener(id_equipo, detalle=True)


def dar_de_baja(id_equipo, id_usuario, rol, *, repositorio, unidad):
    """Baja lógica: el equipo pasa a 'inactivo'; un delegado, solo los suyos."""
    equipo = obtener(id_equipo, repositorio)
    if not puede_gestionar(equipo, id_usuario, rol):
        raise SinPermiso('No tienes permiso para eliminar este equipo.')
    repositorio.actualizar(id_equipo, {'estado': 'inactivo'})
    unidad.confirmar()


def reactivar(id_equipo, *, repositorio, unidad):
    """Un equipo inactivo vuelve a 'activo' si su delegado no tiene otro activo."""
    equipo = repositorio.obtener(id_equipo)
    if equipo is None or equipo.estado == 'activo':
        raise NoEncontrado('Equipo no encontrado o ya activo.')
    if repositorio.activos_de(equipo.id_usuario) >= 1:  # como hoy: 1 fijo y no el cupo configurable (specs/05-plantel)
        raise Conflicto('Este delegado ya tiene 1 equipo activo.')
    repositorio.actualizar(id_equipo, {'estado': 'activo'})
    unidad.confirmar()


def reemplazar_imagen(id_equipo, tipo, stream, nombre, validar, *, repositorio, almacen, unidad):
    """Sube el logo o el banner (``tipo``) del equipo y devuelve su URL.

    ``validar(stream) -> mime`` lanza ValueError si el archivo no sirve. Como hoy, la imagen anterior
    se borra antes de validar la nueva (specs/05-plantel, fuera de alcance).
    """
    campo = IMAGENES[tipo]
    anterior = getattr(obtener(id_equipo, repositorio), campo)
    if anterior:
        try:
            almacen.borrar_archivo(anterior)
        except Exception:
            pass  # se sigue aunque no se pueda borrar
    mime = validar(stream)
    url = almacen.subir_archivo(stream, nombre, f'equipos/{id_equipo}/{tipo}', mime)
    repositorio.actualizar(id_equipo, {campo: url})
    unidad.confirmar()
    return url


def quitar_imagen(id_equipo, tipo, *, repositorio, almacen, unidad):
    """Borra el logo o el banner de Storage y del equipo."""
    campo = IMAGENES[tipo]
    url = getattr(obtener(id_equipo, repositorio), campo)
    if not url:
        raise ReglaDeNegocio(f'El equipo no tiene {tipo}.')
    almacen.borrar_archivo(url)
    repositorio.actualizar(id_equipo, {campo: None})
    unidad.confirmar()
