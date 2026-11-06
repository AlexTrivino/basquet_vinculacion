"""Regla de dependencia del backend (constitución, regla 4), leída de los imports con ast.

Estricto para todo app/: fuera de la fábrica (app/__init__.py) solo hay app/modules/<módulo>/<capa> y
app/shared/<capa>, y en ellos:
  - domain: solo su propio domain y app.shared.domain; nada de Flask, SQLAlchemy, marshmallow, boto3 ni jwt.
  - application: además su application y la application de otros módulos; tampoco frameworks.
  - infrastructure y http: entran a otro módulo solo por su application.
  - shared nunca importa app.modules.
"""
import ast
import re
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / 'app'
FRAMEWORKS = {'flask', 'flask_sqlalchemy', 'flask_cors', 'flask_migrate', 'sqlalchemy', 'marshmallow', 'werkzeug', 'boto3', 'jwt'}
CAPAS = {'domain', 'application', 'infrastructure', 'http'}


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


def test_regla_de_dependencia():
    violaciones = []
    for ruta in sorted([*APP.glob('modules/*/*/**/*.py'), *APP.glob('shared/*/**/*.py')]):
        partes = ruta.relative_to(APP).parts
        modulo, capa = ('shared', partes[1]) if partes[0] == 'shared' else (partes[1], partes[2])
        violaciones += [f'{ruta.relative_to(APP.parent)} ({capa}) importa {d}' for d in _imports(ruta) if not _permitido(modulo, capa, d)]
    assert not violaciones, 'Imports que rompen la regla de dependencia:\n' + '\n'.join(violaciones)


def test_todo_app_esta_en_un_modulo_o_en_shared():
    """app/ es la fábrica, app/modules/<módulo>/<capa> y app/shared/<capa>: nada de rutas, servicios ni utilidades
    sueltas, ni reexportaciones de rutas viejas."""
    sueltos = []
    for ruta in sorted(APP.rglob('*.py')):
        partes = ruta.relative_to(APP).parts
        en_capa = (partes[0] == 'shared' and len(partes) > 2 and partes[1] in CAPAS) or (
            partes[0] == 'modules' and len(partes) > 3 and partes[2] in CAPAS)
        paquete = partes in (('__init__.py',), ('modules', '__init__.py'), ('shared', '__init__.py')) or (
            partes[0] == 'modules' and len(partes) == 3 and partes[2] == '__init__.py')
        if not (en_capa or paquete):
            sueltos.append(str(ruta.relative_to(APP.parent)))
    assert not sueltos, 'Fuera de un módulo o de shared:\n' + '\n'.join(sueltos)
