"""Errores que el dominio y los casos de uso lanzan a propósito; shared/http los traduce a respuestas."""


class ErrorDeDominio(Exception):
    """Base de los errores esperables: el mensaje es el que ve el usuario."""


class NoEncontrado(ErrorDeDominio):
    """Lo pedido no existe."""


class ReglaDeNegocio(ErrorDeDominio):
    """La operación rompe una regla del torneo."""


class Conflicto(ErrorDeDominio):
    """La operación choca con datos que ya existen."""
