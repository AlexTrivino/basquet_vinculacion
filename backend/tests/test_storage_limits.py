import io
import unittest

from app.utils.storage import (
    MAX_LOGO_EQUIPO,
    MAX_BANNER_EQUIPO,
    TIPOS_IMAGEN,
    validar_archivo,
)


class TestStorageLimits(unittest.TestCase):
    def test_constantes_limite_equipo(self):
        """Verifica que los límites de logo y banner correspondan a 2 MB y 5 MB."""
        self.assertEqual(MAX_LOGO_EQUIPO, 2 * 1024 * 1024, "MAX_LOGO_EQUIPO debe ser de 2 MB")
        self.assertEqual(MAX_BANNER_EQUIPO, 5 * 1024 * 1024, "MAX_BANNER_EQUIPO debe ser de 5 MB")

    def test_validacion_exceso_logo(self):
        """Verifica que un archivo mayor a 2 MB sea rechazado con mensaje descriptivo."""
        # Simulamos un stream PNG válido que excede 2 MB (2 MB + 10 bytes)
        png_header = b'\x89PNG\r\n\x1a\n'
        payload = png_header + b'\x00' * (2 * 1024 * 1024 + 10 - len(png_header))
        stream = io.BytesIO(payload)

        with self.assertRaises(ValueError) as ctx:
            validar_archivo(stream, TIPOS_IMAGEN, max_bytes=MAX_LOGO_EQUIPO)

        self.assertIn('El archivo excede el tamaño máximo permitido de 2 MB', str(ctx.exception))

    def test_validacion_exceso_banner(self):
        """Verifica que un archivo mayor a 5 MB sea rechazado con mensaje descriptivo."""
        # Simulamos un stream JPEG válido que excede 5 MB (5 MB + 10 bytes)
        jpeg_header = b'\xff\xd8\xff\xe0'
        payload = jpeg_header + b'\x00' * (5 * 1024 * 1024 + 10 - len(jpeg_header))
        stream = io.BytesIO(payload)

        with self.assertRaises(ValueError) as ctx:
            validar_archivo(stream, TIPOS_IMAGEN, max_bytes=MAX_BANNER_EQUIPO)

        self.assertIn('El archivo excede el tamaño máximo permitido de 5 MB', str(ctx.exception))


if __name__ == '__main__':
    unittest.main()
