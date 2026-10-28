"""Normalización de texto antes de guardar: los nombres, cédulas y teléfonos van en MAYÚSCULAS."""

def normalizar_mayusculas(data: dict, campos: list[str]) -> dict:
    """Convierte a MAYÚSCULAS los campos de texto especificados.
    
    Solo transforma si el campo existe en el dict y es un string.
    No modifica campos None, numéricos ni ausentes.
    """
    for campo in campos:
        if campo in data and isinstance(data[campo], str):
            data[campo] = data[campo].upper()
    return data
