"""
Servicio de almacenamiento en Supabase Storage (S3-compatible).

Responsabilidades:
    1. Validación del tipo MIME real del archivo mediante **inspección de
       magic bytes** (primeros bytes del stream) — sin confiar en la
       extensión del nombre enviado por el cliente.
    2. Subida directa en memoria a Supabase Storage via ``boto3``
       (sin escribir al disco del servidor).
    3. Construcción de la URL pública del archivo subido.

Variables de entorno requeridas:
    - ``SUPABASE_URL``: URL base del proyecto Supabase
      (ej. ``https://xyz.supabase.co``).
    - ``SUPABASE_STORAGE_KEY``: Access Key ID para el bucket S3.
    - ``SUPABASE_STORAGE_SECRET``: Secret Access Key para el bucket S3.
    - ``SUPABASE_STORAGE_BUCKET``: Nombre del bucket de Storage.

¿Cómo se detecta un archivo malicioso renombrado?
    Los formatos de archivo tienen una "firma" en sus primeros bytes llamada
    **magic bytes**. Por ejemplo, todo archivo JPEG genuino comienza con
    ``\\xFF\\xD8\\xFF``. Un script malicioso renombrado como ``malware.jpg``
    tendrá sus propios bytes iniciales (ej. ``#!/bin/bash`` = ``23 21 2F``),
    que **no** coinciden con ninguna firma válida. El validador rechaza
    el archivo con 415 Unsupported Media Type antes de que llegue a S3.
"""
import os
import uuid
import urllib.request
import urllib.error
from typing import IO

from werkzeug.utils import secure_filename
from flask import current_app

# ── Firmas de magic bytes soportadas ──────────────────────────────
# Formato: {magic_bytes_prefix: mime_type}
# Los prefijos se comparan contra los N primeros bytes del archivo.
_FIRMAS_MAGIC = [
    (b'\xff\xd8\xff',         'image/jpeg'),   # JPEG / JPG
    (b'\x89PNG\r\n\x1a\n',   'image/png'),    # PNG
    (b'%PDF',                  'application/pdf'),  # PDF
    (b'RIFF',                  'image/webp'),   # WebP (verificación adicional abajo)
]

# Longitud máxima de firma a leer del stream (PNG tiene 8 bytes)
_MAGIC_READ_BYTES = 12

# Tipos permitidos con sus extensiones canónicas
_EXTENSIONES = {
    'image/jpeg':       '.jpg',
    'image/png':        '.png',
    'image/webp':       '.webp',
    'application/pdf':  '.pdf',
}

# Subtipos agrupados para validación contextual
TIPOS_IMAGEN = frozenset({'image/jpeg', 'image/png', 'image/webp'})
TIPOS_DOCUMENTO = frozenset({'application/pdf'})
TIPOS_PERMITIDOS = TIPOS_IMAGEN | TIPOS_DOCUMENTO

# Tamaños máximos permitidos por contexto (en bytes)
MAX_FOTO_JUGADOR = 500 * 1024        # 500 KB
MAX_LOGO_EQUIPO = 500 * 1024         # 500 KB
MAX_BANNER_EQUIPO = 1 * 1024 * 1024  # 1 MB
MAX_COMPROBANTE = 5 * 1024 * 1024    # 5 MB


# ── Función de validación ─────────────────────────────────────────

def detectar_mime(file_stream: IO) -> str | None:
    """Detecta el tipo MIME real de un archivo por sus magic bytes.

    Lee solo los primeros ``_MAGIC_READ_BYTES`` bytes del stream sin
    consumirlo (lo restaura a posición 0 tras la lectura).

    Args:
        file_stream: Objeto file-like (``werkzeug.FileStorage.stream``).

    Returns:
        String MIME (ej. ``'image/jpeg'``) o ``None`` si no reconocido.
    """
    cabecera = file_stream.read(_MAGIC_READ_BYTES)
    file_stream.seek(0)

    for firma, mime in _FIRMAS_MAGIC:
        if cabecera.startswith(firma):
            # ── Caso especial WebP ────────────────────────────────
            # RIFF es un contenedor (también usado por AVI, WAV).
            # WebP real tiene "WEBP" en los bytes 8-12.
            if firma == b'RIFF':
                if cabecera[8:12] != b'WEBP':
                    return None
            return mime

    return None  # Tipo no reconocido → rechazar


def validar_archivo(file_stream: IO, tipos_aceptados: frozenset, max_bytes: int = None) -> str:
    """Valida el tipo real de un archivo por sus magic bytes y su tamaño máximo.

    Args:
        file_stream: Stream del archivo.
        tipos_aceptados: Conjunto de MIME types permitidos (ej. ``TIPOS_IMAGEN``).
        max_bytes: Tamaño máximo permitido en bytes.

    Returns:
        MIME type detectado (string).

    Raises:
        ValueError: Si el tipo real no coincide o si el archivo excede el tamaño.
    """
    if max_bytes is not None:
        file_stream.seek(0, 2)  # Mover cursor al final
        tamaño_bytes = file_stream.tell()
        file_stream.seek(0)     # Devolver cursor al inicio
        
        if tamaño_bytes > max_bytes:
            mb = max_bytes / (1024 * 1024)
            raise ValueError(
                f'El archivo excede el tamaño máximo permitido de {mb:g} MB.'
            )

    mime = detectar_mime(file_stream)

    if mime is None or mime not in tipos_aceptados:
        tipos_legibles = ', '.join(sorted(tipos_aceptados))
        raise ValueError(
            f'Tipo de archivo no permitido. '
            f'Se aceptan: {tipos_legibles}. '
            f'El archivo fue analizado por su contenido real, no por su extensión.'
        )

    return mime


# ── Función principal de subida ───────────────────────────────────

def subir_archivo(
    file_stream: IO,
    nombre_original: str,
    carpeta: str,
    mime_type: str,
) -> str:
    """Sube un archivo a Supabase Storage y retorna su URL pública."""
    bucket = os.getenv('SUPABASE_STORAGE_BUCKET', 'archivos')
    supabase_url = os.getenv('SUPABASE_URL', '').rstrip('/')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not service_role_key:
        raise RuntimeError('Falta la credencial SUPABASE_SERVICE_ROLE_KEY en el servidor.')

    nombre_base = secure_filename(nombre_original)
    extension = _EXTENSIONES.get(mime_type, '')
    nombre_unico = f'{uuid.uuid4().hex}_{nombre_base}'

    if extension and not nombre_unico.lower().endswith(extension):
        nombre_unico = f'{nombre_unico}{extension}'

    ruta_objeto = f'{carpeta.strip("/")}/{nombre_unico}'
    upload_url = f'{supabase_url}/storage/v1/object/{bucket}/{ruta_objeto}'

    try:
        data = file_stream.read()
        req = urllib.request.Request(
            upload_url,
            data=data,
            headers={
                'Authorization': f'Bearer {service_role_key}',
                'Content-Type': mime_type,
            },
            method='POST'
        )
        with urllib.request.urlopen(req) as response:
            pass
    except urllib.error.URLError as e:
        current_app.logger.exception('Error de Storage (REST API):')
        raise RuntimeError(
            'No se pudo establecer conexión con el servidor de almacenamiento. Intente de nuevo más tarde.'
        )

    public_url_base = os.getenv('SUPABASE_PUBLIC_URL', supabase_url).rstrip('/')
    url_publica = f'{public_url_base}/storage/v1/object/public/{bucket}/{ruta_objeto}'
    return url_publica


def borrar_archivo(ruta_objeto: str):
    """Elimina un objeto de Supabase Storage."""
    bucket = os.getenv('SUPABASE_STORAGE_BUCKET', 'archivos')
    supabase_url = os.getenv('SUPABASE_URL', '').rstrip('/')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    prefijo_url = f"/storage/v1/object/public/{bucket}/"
    if prefijo_url in ruta_objeto:
        ruta_objeto = ruta_objeto.split(prefijo_url)[-1]
        
    delete_url = f'{supabase_url}/storage/v1/object/{bucket}/{ruta_objeto}'
        
    try:
        req = urllib.request.Request(
            delete_url,
            headers={'Authorization': f'Bearer {service_role_key}'},
            method='DELETE'
        )
        with urllib.request.urlopen(req) as response:
            pass
    except urllib.error.URLError as e:
        current_app.logger.exception('Error al borrar en Storage (REST API):')
        # Silenciamos el error para no bloquear transacciones
        pass
