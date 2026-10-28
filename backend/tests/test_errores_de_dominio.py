"""Los errores del dominio salen con el código HTTP que la API ya usa hoy para cada caso."""
import pytest

from app import create_app
from app.shared.domain.errores import Conflicto, NoEncontrado, ReglaDeNegocio


class CedulaRepetida(Conflicto):
    pass


@pytest.mark.parametrize('error, codigo, estado', [
    (NoEncontrado('Torneo no encontrado.'), 'NOT_FOUND', 404),
    (ReglaDeNegocio('La plantilla admite hasta 18 jugadores.'), 'VALIDATION_ERROR', 422),
    (Conflicto('El equipo ya está inscrito.'), 'CONFLICT', 409),
    (CedulaRepetida('Ya existe un jugador con esa cédula.'), 'CONFLICT', 409),
])
def test_error_de_dominio_sale_como_hoy(error, codigo, estado):
    app = create_app()

    @app.get('/prueba-error')
    def lanzar():
        raise error

    respuesta = app.test_client().get('/prueba-error')
    assert respuesta.status_code == estado
    assert respuesta.get_json() == {'success': False, 'error_code': codigo, 'message': str(error)}
