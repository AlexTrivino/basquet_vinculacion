"""Base de datos de contrato: un torneo pequeño pero completo, con ids fijos.

Torneo 1 (en curso):
  - Categoría 1, Juvenil masculino, formato un_grupo_semis: los 6 partidos de grupo jugados
    (uno por W.O.), la SF1 programada y la SF2 lista para crearse.
  - Categoría 2, Cadetes +30 femenino, formato tres_final_directa: dos partidos jugados, uno
    programado, uno suspendido, uno en curso y uno anulado que todavía tiene estadísticas.
Torneo 2 (programado): en la categoría de dos grupos, inscripciones pendiente, borrador (con
  5 jugadores, lista para enviarse), rechazada y dos aprobadas sin grupo; otra categoría libre para
  inscribirse y otra vacía.
Torneo 3 (finalizado), torneo 4 (anulado).
Equipos inactivos: el 7 se puede reactivar y el 8 no (su dueño ya tiene equipos activos).

Todas las fechas son anteriores a la creación de las referencias (28/10/2026): así una fecha de los datos
nunca coincide con el día en que corren las pruebas, que se normaliza a <hoy>. Las fechas de creación se fijan
al final para que el orden por fecha no dependa del reloj.
"""
from datetime import date, datetime, time

from sqlalchemy import text

from app.shared.infrastructure.db import db
from app.shared.infrastructure.modelos import (
    Categoria, Documentacion, Equipo, Estadistica, Inscripcion, Jugador, Partido, Patrocinador,
    PatrocinadorTorneo, Plantilla, Sancion, Torneo, Usuario,
)
from app.shared.infrastructure.modelos.documento_jugador import DocumentoJugador

URL = 'https://supabase.test/storage/v1/object/public/archivos'

# Rol → id de usuario (el token de cada caso lleva este id)
USUARIOS = {
    'admin': 'u-admin',
    'del1': 'u-del-1',      # delegado de SAN JOSÉ (equipo 1)
    'del2': 'u-del-2',      # delegado de FAE (equipo 2)
    'del3': 'u-del-3',      # delegado sin equipo
    'visor': 'u-visor',
    'inactivo': 'u-inactivo',
}


def sembrar():
    db.session.add_all([
        Usuario(id_usuario='u-admin', nombre='Admin Manta', correo='admin@manta.test', rol='super_admin'),
        Usuario(id_usuario='u-del-1', nombre='Delegado San José', correo='del1@manta.test', rol='delegado'),
        Usuario(id_usuario='u-del-2', nombre='Delegado FAE', correo='del2@manta.test', rol='delegado'),
        Usuario(id_usuario='u-del-3', nombre='Delegada sin equipo', correo='del3@manta.test', rol='delegado'),
        Usuario(id_usuario='u-visor', nombre='Visor', correo='visor@manta.test', rol='visor'),
        Usuario(id_usuario='u-inactivo', nombre='Cuenta inactiva', correo='inactivo@manta.test', rol='delegado', estado='inactivo'),
    ])
    db.session.add_all([
        Torneo(id_torneo=1, nombre='INTERCOLEGIAL 2026', fecha_inicio=date(2026, 8, 1), fecha_fin=date(2026, 10, 20),
               estado='en_curso', url_calendario_excel=f'{URL}/torneos/1/calendario.xlsx'),
        Torneo(id_torneo=2, nombre='NACIONAL +40 2026', fecha_inicio=date(2026, 10, 10), fecha_fin=date(2026, 10, 27), estado='programado'),
        Torneo(id_torneo=3, nombre='INTERCOLEGIAL 2025', fecha_inicio=date(2025, 9, 1), fecha_fin=date(2025, 11, 30), estado='finalizado'),
        Torneo(id_torneo=4, nombre='COMERCIAL 2026', fecha_inicio=date(2026, 7, 1), fecha_fin=date(2026, 7, 30), estado='anulado'),
    ])
    db.session.flush()
    db.session.add_all([
        Categoria(id_categoria=1, nombre_categoria='Juvenil', genero_categoria='masculino', edad_minima=0, id_torneo=1, formato='un_grupo_semis'),
        Categoria(id_categoria=2, nombre_categoria='Cadetes +30', genero_categoria='femenino', edad_minima=30, id_torneo=1, formato='tres_final_directa'),
        Categoria(id_categoria=3, nombre_categoria='Senior +40', genero_categoria='masculino', edad_minima=40, id_torneo=2, formato='dos_grupos_cruces'),
        Categoria(id_categoria=4, nombre_categoria='Juvenil', genero_categoria='masculino', edad_minima=0, id_torneo=3),
        Categoria(id_categoria=5, nombre_categoria='Libre', genero_categoria='masculino', edad_minima=18, id_torneo=4),
        Categoria(id_categoria=6, nombre_categoria='Senior +50', genero_categoria='masculino', edad_minima=50, id_torneo=2),
        Categoria(id_categoria=7, nombre_categoria='Libre', genero_categoria='femenino', edad_minima=18, id_torneo=2),
    ])
    db.session.add_all([
        Equipo(id_equipo=1, nombre_equipo='SAN JOSÉ', id_usuario='u-del-1', url_logo=f'{URL}/equipos/1/logo/sanjose.png',
               url_foto_equipo=f'{URL}/equipos/1/banner/sanjose.jpg'),
        Equipo(id_equipo=2, nombre_equipo='FAE', id_usuario='u-del-2', url_logo=f'{URL}/equipos/2/logo/fae.png'),
        Equipo(id_equipo=3, nombre_equipo='MANTA', id_usuario='u-admin'),
        Equipo(id_equipo=4, nombre_equipo='STELLA MARIS', id_usuario='u-admin'),
        Equipo(id_equipo=5, nombre_equipo='JUAN MONTALVO', id_usuario='u-admin'),
        Equipo(id_equipo=6, nombre_equipo='4 DE NOVIEMBRE', id_usuario='u-admin'),
        Equipo(id_equipo=7, nombre_equipo='PEDRO BALDA', id_usuario='u-inactivo', estado='inactivo'),
        Equipo(id_equipo=8, nombre_equipo='COLEGIO JAVIER', id_usuario='u-admin', estado='inactivo'),
    ])
    jugadores = [
        (1, 'BRYAN CHÁVEZ VÉLEZ', 'masculino', date(2008, 3, 10)),
        (2, 'MATEO MERO PINARGOTE', 'masculino', date(2008, 7, 21)),
        (3, 'DAVID CEDEÑO ZAMBRANO', 'masculino', date(2009, 1, 5)),
        (4, 'LUIS ALAVA PICO', 'masculino', date(2008, 11, 30)),
        (5, 'JORGE ZAMBRANO ALCÍVAR', 'masculino', date(2008, 2, 14)),
        (6, 'CARLOS MACÍAS LOOR', 'masculino', date(2008, 9, 9)),
        (7, 'SEBASTIÁN MACÍAS MOREIRA', 'masculino', date(2008, 5, 5)),
        (8, 'JOSUÉ ALCÍVAR MACÍAS', 'masculino', date(2009, 6, 1)),
        (9, 'ANA MERO VÉLEZ', 'femenino', date(1990, 4, 4)),
        (10, 'MARÍA LOOR CEDEÑO', 'femenino', date(1992, 8, 8)),
        (11, 'JULIA PICO MERO', 'femenino', date(1989, 12, 12)),
        (12, 'RAMÓN ZAMBRANO VERA', 'masculino', date(1980, 3, 3)),
        (13, 'PEDRO ALAVA MERO', 'masculino', date(1978, 1, 20)),
        (14, 'JUAN PICO VERA', 'masculino', date(1979, 2, 11)),
        (15, 'LUIS VERA LOOR', 'masculino', date(1980, 6, 6)),
        (16, 'ÁNGEL MERO PICO', 'masculino', date(1981, 7, 7)),
        (17, 'RAÚL LOOR ALAVA', 'masculino', date(1977, 8, 8)),
        (18, 'MANUEL VERA PICO', 'masculino', date(1975, 9, 9)),
    ]
    for i, nombre, genero, nacimiento in jugadores:
        db.session.add(Jugador(
            id_jugador=i, nombre=nombre, genero=genero, documento_identificacion=f'13100000{i:02d}', fecha_nacimiento=nacimiento,
            correo=f'jugador{i}@manta.test', telefono=f'09900000{i:02d}',
            url_foto=f'{URL}/jugadores/{i}/foto.jpg' if i % 3 == 1 else None,
            url_cedula=f'{URL}/jugadores/{i}/cedula.pdf' if i <= 4 else None,
        ))
    db.session.flush()

    def inscripcion(id_, torneo, categoria, equipo, estado, cuando=datetime(2026, 7, 15, 12, 0), comprobante=None):
        db.session.add(Inscripcion(id_inscripcion=id_, id_torneo=torneo, id_categoria=categoria, id_equipo=equipo,
                                   estado_inscripcion=estado, fecha_inscripcion=cuando, url_comprobante_pago=comprobante))

    for id_, equipo in ((1, 1), (2, 2), (3, 3), (4, 4)):
        inscripcion(id_, 1, 1, equipo, 'aprobado', comprobante=f'{URL}/inscripciones/{id_}/pago.pdf')
    for id_, equipo in ((5, 1), (6, 5), (7, 6)):
        inscripcion(id_, 1, 2, equipo, 'aprobado')
    inscripcion(8, 2, 3, 2, 'pendiente', datetime(2026, 10, 5, 9, 30), f'{URL}/inscripciones/8/pago.pdf')
    inscripcion(9, 2, 3, 1, 'borrador', datetime(2026, 1, 10, 8, 0), f'{URL}/inscripciones/9/pago.png')
    inscripcion(10, 2, 3, 4, 'rechazado', datetime(2026, 10, 6, 10, 0))
    inscripcion(11, 3, 4, 1, 'aprobado', datetime(2025, 8, 20, 10, 0))
    inscripcion(12, 3, 4, 2, 'aprobado', datetime(2025, 8, 21, 10, 0))
    # Senior +40 (dos grupos): dos aprobados todavía sin grupo
    inscripcion(13, 2, 3, 3, 'aprobado', datetime(2026, 10, 7, 11, 0))
    inscripcion(14, 2, 3, 6, 'aprobado', datetime(2026, 10, 8, 11, 0))

    plantillas = [
        # (id, jugador, torneo, equipo, categoría, dorsal)
        (1, 1, 1, 1, 1, 4), (2, 2, 1, 1, 1, 7), (3, 3, 1, 1, 1, 10), (4, 4, 1, 1, 1, 12),
        (5, 5, 1, 2, 1, 5), (6, 6, 1, 2, 1, 8), (7, 7, 1, 3, 1, 9), (8, 8, 1, 4, 1, 11),
        (9, 9, 1, 1, 2, 3), (10, 10, 1, 5, 2, 6), (11, 11, 1, 6, 2, 14),
        (12, 12, 2, 2, 3, 23),
        (13, 13, 2, 1, 3, 1), (14, 14, 2, 1, 3, 2), (15, 15, 2, 1, 3, 3), (16, 16, 2, 1, 3, 4), (17, 17, 2, 1, 3, 5),
        (18, 1, 3, 1, 4, 4), (19, 5, 3, 2, 4, 5),
    ]
    for id_, jugador, torneo, equipo, categoria, dorsal in plantillas:
        db.session.add(Plantilla(id_plantilla=id_, id_jugador=jugador, id_torneo=torneo, id_equipo=equipo,
                                 id_categoria=categoria, numero_camiseta=dorsal))

    def partido(id_, torneo, categoria, local, visita, dia, hora, estado, ml=0, mv=0, fase='PRIMERA FASE', llave=None, procesadas=False, acta=None):
        db.session.add(Partido(id_partido=id_, id_torneo=torneo, id_categoria=categoria, id_equipo_local=local,
                               id_equipo_visitante=visita, fecha=dia, hora=hora, estado=estado, marcador_local=ml,
                               marcador_visitante=mv, fase=fase, llave=llave, stats_local_procesadas=procesadas,
                               stats_visitante_procesadas=procesadas, url_planilla_fiba=acta))

    # Juvenil: grupo único terminado (1.º SAN JOSÉ, 2.º FAE, 3.º STELLA MARIS, 4.º MANTA)
    partido(1, 1, 1, 1, 2, date(2026, 8, 8), time(17, 0), 'finalizado', 60, 50, procesadas=True, acta=f'{URL}/partidos/1/acta.pdf')
    partido(2, 1, 1, 3, 4, date(2026, 8, 8), time(18, 30), 'finalizado', 55, 58)
    partido(3, 1, 1, 1, 3, date(2026, 8, 15), time(17, 0), 'finalizado', 70, 65, procesadas=True)
    partido(4, 1, 1, 2, 4, date(2026, 8, 15), time(18, 30), 'finalizado_wo', 20, 0)
    partido(5, 1, 1, 1, 4, date(2026, 8, 22), time(17, 0), 'finalizado', 62, 48)
    partido(6, 1, 1, 2, 3, date(2026, 8, 22), time(18, 30), 'finalizado', 51, 49)
    partido(7, 1, 1, 1, 3, date(2026, 9, 12), time(19, 0), 'programado', fase='Semifinal', llave='SF1')
    # Cadetes +30 femenino: ida y vuelta a medio jugar
    partido(8, 1, 2, 1, 5, date(2026, 8, 9), time(16, 0), 'finalizado', 40, 35, procesadas=True)
    partido(9, 1, 2, 5, 6, date(2026, 8, 16), time(16, 0), 'finalizado', 30, 33)
    partido(10, 1, 2, 6, 1, date(2026, 9, 13), time(16, 0), 'programado')
    partido(11, 1, 2, 5, 1, date(2026, 9, 20), time(16, 0), 'suspendido')
    partido(12, 1, 2, 6, 5, date(2026, 8, 23), time(16, 0), 'anulado', 22, 20, procesadas=True)
    partido(13, 1, 2, 1, 6, date(2026, 9, 6), time(16, 0), 'en_curso', 12, 10)
    # Torneo 2025
    partido(14, 3, 4, 1, 2, date(2025, 10, 10), time(17, 0), 'finalizado', 45, 40)
    db.session.flush()

    lineas = [
        # (partido, jugador, puntos, triples, rebotes, asistencias, tapones, tiros libres, faltas)
        (1, 1, 22, 2, 5, 3, 1, 4, 2), (1, 2, 10, 0, 7, 1, 0, 2, 3), (1, 5, 18, 3, 4, 2, 0, 3, 1), (1, 6, 12, 1, 9, 0, 2, 1, 4),
        (3, 1, 15, 1, 6, 4, 0, 2, 1), (3, 7, 20, 4, 3, 2, 1, 2, 2),
        (8, 9, 18, 2, 6, 3, 0, 4, 2), (8, 10, 12, 0, 8, 1, 1, 2, 3),
        (12, 10, 9, 1, 2, 0, 0, 1, 1), (12, 11, 7, 0, 3, 2, 0, 1, 2),
    ]
    for p, j, pts, tri, reb, ast, tap, tl, faltas in lineas:
        db.session.add(Estadistica(id_partido=p, id_jugador=j, puntos_anotados=pts, triples_anotados=tri, rebotes=reb,
                                   asistencias=ast, tapones=tap, tiros_libres_anotados=tl, faltas_cometidas=faltas))
    db.session.add_all([
        Sancion(id_sancion=1, motivo='Falta descalificante', fecha=date(2026, 8, 15), estado='activa', id_jugador=7, id_partido=3),
        Sancion(id_sancion=2, motivo='Técnica', fecha=date(2026, 8, 8), estado='cumplida', id_jugador=6, id_partido=1),
        Patrocinador(id_patrocinador=1, nombre_patrocinador='FERRETERÍA MANTA', url_logo_patrocinador=f'{URL}/patrocinadores/1.png'),
        Patrocinador(id_patrocinador=2, nombre_patrocinador='CLÍNICA DEL PACÍFICO'),
        Documentacion(id_documentacion=1, titulo='Bases del torneo', url_documento=f'{URL}/torneos/1/bases.pdf', id_torneo=1),
        DocumentoJugador(url_documento=f'{URL}/jugadores/1/cedula.pdf', tipo_documento='cedula', estado_validacion='aprobado', id_jugador=1),
    ])
    db.session.flush()
    db.session.add(PatrocinadorTorneo(id_patrocinador=1, id_torneo=1))
    db.session.commit()

    # Fechas de creación fijas y distintas por fila: el orden por fecha no depende del reloj
    for (tabla,) in db.session.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).all():
        columnas = {c[1] for c in db.session.execute(text(f'PRAGMA table_info("{tabla}")')).all()}
        if {'created_at', 'updated_at'} <= columnas:
            db.session.execute(text(f'UPDATE "{tabla}" SET created_at = datetime(:c, \'+\' || rowid || \' minutes\'), '
                                    f'updated_at = datetime(:c, \'+\' || rowid || \' minutes\')'), {'c': '2026-10-01 12:00:00'})
    db.session.commit()
