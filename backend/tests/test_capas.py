"""Regla de dependencia del backend (constitución, regla 4), leída de los imports con ast.

Estricto para lo nuevo (app/modules/<módulo>/<capa> y app/shared/<capa>):
  - domain: solo su propio domain y app.shared.domain; nada de Flask, SQLAlchemy, marshmallow, boto3 ni jwt.
  - application: además su application y la application de otros módulos; tampoco frameworks.
  - infrastructure y http: entran a otro módulo solo por su application.
  - shared nunca importa app.modules.
Trinquete para lo viejo: las líneas de app/routes que usan el ORM solo pueden bajar.
Dentro de app/ nadie importa las rutas viejas que hoy reexportan app/shared.
"""
import ast
import re
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / 'app'
FRAMEWORKS = {'flask', 'flask_sqlalchemy', 'flask_cors', 'flask_migrate', 'sqlalchemy', 'marshmallow', 'werkzeug', 'boto3', 'jwt'}
ORM_EN_RUTAS = 41  # trinquete: cuando baje, bájalo aquí en el mismo commit
RUTAS_VIEJAS = ('app.models', 'app.utils.storage', 'app.utils.response', 'app.utils.pagination', 'app.utils.auth_middleware',
                'app.utils.error_handlers')  # hoy reexportan app/shared (fase 1)


def _dentro(destino, *prefijos):
    return any(destino == p or destino.startswith(p + '.') for p in prefijos)


def _imports(ruta):
    """Nombres absolutos que importa un archivo (los relativos se resuelven contra su paquete)."""
    paquete = ruta.relative_to(APP.parent).with_suffix('').parts[:-1]
    for nodo in ast.walk(ast.parse(ruta.read_text(encoding='utf-8'))):
        if isinstance(nodo, ast.Import):
            yield from (alias.name for alias in nodo.names)
        elif isinstance(nodo, ast.ImportFrom):
            base = '.'.join(paquete[:len(paquete) - nodo.level + 1] + ((nodo.module,) if nodo.module else ())) if nodo.level else nodo.module
            yield from (f'{base}.{alias.name}' for alias in nodo.names)


def _permitido(modulo, capa, destino):
    if destino.split('.')[0] in FRAMEWORKS:
        return capa not in ('domain', 'application')
    if not _dentro(destino, 'app'):
        return True  # biblioteca estándar y librerías de utilidad
    propio = 'app.shared' if modulo == 'shared' else f'app.modules.{modulo}'
    application_ajena = re.match(r'app\.modules\.\w+\.application(\.|$)', destino)
    if modulo == 'shared' and _dentro(destino, 'app.modules'):
        return False
    if capa == 'domain':
        return _dentro(destino, f'{propio}.domain', 'app.shared.domain')
    if capa == 'application':
        return _dentro(destino, f'{propio}.domain', f'{propio}.application', 'app.shared.domain') or bool(application_ajena)
    return not _dentro(destino, 'app.modules') or _dentro(destino, propio) or bool(application_ajena)


def test_capas_de_lo_nuevo():
    violaciones = []
    for ruta in sorted([*APP.glob('modules/*/*/**/*.py'), *APP.glob('shared/*/**/*.py')]):
        partes = ruta.relative_to(APP).parts
        modulo, capa = ('shared', partes[1]) if partes[0] == 'shared' else (partes[1], partes[2])
        violaciones += [f'{ruta.relative_to(APP.parent)} ({capa}) importa {d}' for d in _imports(ruta) if not _permitido(modulo, capa, d)]
    assert not violaciones, 'Imports que rompen la regla de dependencia:\n' + '\n'.join(violaciones)


def test_app_importa_desde_shared():
    """Las rutas viejas solo quedan como reexportaciones para pruebas, scripts y migraciones."""
    def es_reexportacion(ruta):
        return _dentro('.'.join(ruta.relative_to(APP.parent).with_suffix('').parts).removesuffix('.__init__'), *RUTAS_VIEJAS)

    viejos = [f'{ruta.relative_to(APP.parent)} importa {d}' for ruta in sorted(APP.rglob('*.py')) if not es_reexportacion(ruta)
              for d in _imports(ruta) if _dentro(d, *RUTAS_VIEJAS, 'app.db', 'app.migrate')]
    assert not viejos, 'Importa desde app/shared:\n' + '\n'.join(viejos)


def test_orm_en_rutas_viejas_no_sube():
    lineas = 0
    for ruta in APP.glob('routes/**/*.py'):
        nodos = ast.walk(ast.parse(ruta.read_text(encoding='utf-8')))
        lineas += len({n.lineno for n in nodos if isinstance(n, ast.Attribute) and (
            n.attr == 'query' or (n.attr == 'session' and isinstance(n.value, ast.Name) and n.value.id == 'db'))})
    assert lineas == ORM_EN_RUTAS, (
        f'app/routes usa el ORM en {lineas} líneas y el trinquete dice {ORM_EN_RUTAS}. '
        'Si bajó, actualiza ORM_EN_RUTAS; si subió, esa consulta va en la infraestructura de un módulo.')
