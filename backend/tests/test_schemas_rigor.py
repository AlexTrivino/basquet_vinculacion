"""
Tests rigurosos para schemas Marshmallow y DTOs de Torneo, Partido e Inscripción.
Garantiza integridad de fechas, nesting de relaciones y prevención de errores de mapeo 422.
"""
from datetime import date, time
from app.schemas.inscripcion_schema import _TorneoResumenSchema, _EquipoResumenSchema, _CategoriaResumenSchema
from app.schemas.partido_schema import _TorneoEnPartidoSchema, PartidoPublicSchema


class TestSchemasRigor:
    """Suite de validación rigurosa de serialización y deserialización DTO."""



    def test_torneo_resumen_schema_con_fechas_completas(self):
        """Verifica que _TorneoResumenSchema serialice correctamente fechas de inicio y fin."""
        schema = _TorneoResumenSchema()
        datos = {
            "id_torneo": 1,
            "nombre": "Copa Manta 2026",
            "estado": "en_curso",
            "fecha_inicio": date(2026, 6, 1),
            "fecha_fin": date(2026, 8, 31),
        }
        res = schema.dump(datos)
        assert res["id_torneo"] == 1
        assert res["nombre"] == "Copa Manta 2026"
        assert res["estado"] == "en_curso"
        assert res["fecha_inicio"] == "2026-06-01"
        assert res["fecha_fin"] == "2026-08-31"

    def test_torneo_resumen_schema_con_fechas_nulas(self):
        """Tolera torneos sin fechas asignadas (compatibilidad retroactiva)."""
        schema = _TorneoResumenSchema()
        datos = {
            "id_torneo": 2,
            "nombre": "Torneo Sin Fechas",
            "estado": "inscripcion",
            "fecha_inicio": None,
            "fecha_fin": None,
        }
        res = schema.dump(datos)
        assert res["id_torneo"] == 2
        assert res["fecha_inicio"] is None
        assert res["fecha_fin"] is None

    def test_torneo_en_partido_schema_serializacion(self):
        """Verifica que el schema anidado de torneo dentro de partidos serialice fechas."""
        schema = _TorneoEnPartidoSchema()
        datos = {
            "id_torneo": 10,
            "nombre": "Liga Provincial 2026",
            "estado": "en_curso",
            "fecha_inicio": date(2026, 5, 10),
            "fecha_fin": date(2026, 9, 20),
        }
        res = schema.dump(datos)
        assert res["id_torneo"] == 10
        assert res["nombre"] == "Liga Provincial 2026"
        assert res["fecha_inicio"] == "2026-05-10"

    def test_partido_publico_schema_completo(self):
        """Verifica la serialización completa de un partido público con equipos y torneo anidados."""
        schema = PartidoPublicSchema()
        datos = {
            "id_partido": 100,
            "id_torneo": 5,
            "fase": "Semifinales",
            "estado": "finalizado",
            "marcador_local": 88,
            "marcador_visitante": 82,
            "fecha": date(2026, 7, 15),
            "hora": time(19, 30),
            "ubicacion": "Coliseo Central",
            "equipo_local": {
                "id_equipo": 1,
                "nombre_equipo": "Delfines BC",
                "url_logo": "https://img.com/logo1.png",
            },
            "equipo_visitante": {
                "id_equipo": 2,
                "nombre_equipo": "Tiburones BBC",
                "url_logo": None,
            },
            "torneo": {
                "id_torneo": 5,
                "nombre": "Supercopa 2026",
                "estado": "en_curso",
                "fecha_inicio": date(2026, 6, 1),
            },
        }
        res = schema.dump(datos)
        assert res["id_partido"] == 100
        assert res["marcador_local"] == 88
        assert res["marcador_visitante"] == 82
        assert res["equipo_local"]["nombre_equipo"] == "Delfines BC"
        assert res["equipo_visitante"]["nombre_equipo"] == "Tiburones BBC"
        assert res["torneo"]["fecha_inicio"] == "2026-06-01"
