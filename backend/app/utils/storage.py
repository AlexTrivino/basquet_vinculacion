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
from typing import IO

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
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


def validar_archivo(file_stream: IO, tipos_aceptados: frozenset) -> str:
    """Valida el tipo real de un archivo por sus magic bytes.

    El límite de tamaño se aplica globalmente vía ``MAX_CONTENT_LENGTH`` en
    la configuración de Flask, evitando así una segunda lectura completa del
    stream (doble consumo de memoria) en esta función.

    Args:
        file_stream: Stream del archivo.
        tipos_aceptados: Conjunto de MIME types permitidos (ej. ``TIPOS_IMAGEN``).

    Returns:
        MIME type detectado (string).

    Raises:
        ValueError: Si el tipo real del archivo no coincide con los permitidos.
    """
    mime = detectar_mime(file_stream)

    if mime is None or mime not in tipos_aceptados:
        tipos_legibles = ', '.join(sorted(tipos_aceptados))
        raise ValueError(
            f'Tipo de archivo no permitido. '
            f'Se aceptan: {tipos_legibles}. '
            f'El archivo fue analizado por su contenido real, no por su extensión.'
        )

    return mime


# ── Cliente boto3 (lazy singleton) ───────────────────────────────

_s3_client = None


def _get_s3_client():
    """Retorna (o crea) el cliente boto3 apuntando a Supabase Storage S3.

    El cliente se inicializa una sola vez (singleton lazy) para
    reutilizar la conexión HTTP entre requests.

    Supabase Storage es S3-compatible. El endpoint tiene la forma:
    ``https://<project-ref>.supabase.co/storage/v1/s3``
    """
    global _s3_client

    if _s3_client is None:
        supabase_url = os.getenv('SUPABASE_URL', '').rstrip('/')
        _s3_client = boto3.client(
            's3',
            endpoint_url=f'{supabase_url}/storage/v1/s3',
            aws_access_key_id=os.getenv('SUPABASE_STORAGE_KEY'),
            aws_secret_access_key=os.getenv('SUPABASE_STORAGE_SECRET'),
            region_name='us-east-1',  # Supabase siempre usa esta región
            config=Config(s3={'addressing_style': 'path'}),
        )

    return _s3_client


# ── Función principal de subida ───────────────────────────────────

def subir_archivo(
    file_stream: IO,
    nombre_original: str,
    carpeta: str,
    mime_type: str,
) -> str:
    """Sube un archivo a Supabase Storage y retorna su URL pública.

    El archivo viaja en memoria directamente desde el request HTTP
    hasta Supabase — **cero escrituras en disco** del servidor.

    Naming convention del archivo en Storage::

        {carpeta}/{uuid4}_{nombre_seguro}
        ej: jugadores/fotos/3f2a1b4c_alex_gonzalez.jpg

    Usar UUID garantiza unicidad y previene sobrescritura accidental.

    Args:
        file_stream: Stream del archivo ya validado y posicionado en 0.
        nombre_original: Nombre original del archivo (del cliente).
        carpeta: Ruta de destino dentro del bucket (ej. ``'jugadores/fotos'``).
        mime_type: MIME type detectado (ej. ``'image/jpeg'``).

    Returns:
        URL pública del archivo subido.

    Raises:
        RuntimeError: Si la subida a S3 falla.
    """
    bucket = os.getenv('SUPABASE_STORAGE_BUCKET', 'archivos')
    supabase_url = os.getenv('SUPABASE_URL', '').rstrip('/')

    # Nombre seguro: elimina rutas, caracteres especiales y espacios
    nombre_base = secure_filename(nombre_original)
    extension = _EXTENSIONES.get(mime_type, '')
    nombre_unico = f'{uuid.uuid4().hex}_{nombre_base}'

    # Asegurar extensión canónica según MIME real (no la del cliente)
    if extension and not nombre_unico.lower().endswith(extension):
        nombre_unico = f'{nombre_unico}{extension}'

    ruta_objeto = f'{carpeta.strip("/")}/{nombre_unico}'

    try:
        s3 = _get_s3_client()
        s3.upload_fileobj(
            file_stream,
            bucket,
            ruta_objeto,
            ExtraArgs={
                'ContentType': mime_type,
                'ACL': 'public-read',
            },
        )
    except (BotoCoreError, ClientError) as e:
        current_app.logger.exception('Error de Storage de S3:')
        raise RuntimeError(
            'No se pudo establecer conexión con el servidor de almacenamiento. Intente de nuevo más tarde.'
        )

    # URL pública de Supabase Storage
    url_publica = (
        f'{supabase_url}/storage/v1/object/public/{bucket}/{ruta_objeto}'
    )
    return url_publica

def borrar_archivo(ruta_objeto: str):
    """Elimina un objeto de Supabase Storage.
    
    Permite eliminar archivos huérfanos si una transacción en base de datos falla.
    Si la ruta_objeto incluye la URL base de Supabase, la recorta a la llave real.
    """
    bucket = os.getenv('SUPABASE_STORAGE_BUCKET', 'archivos')
    
    prefijo_url = f"/storage/v1/object/public/{bucket}/"
    if prefijo_url in ruta_objeto:
        ruta_objeto = ruta_objeto.split(prefijo_url)[-1]
        
    try:
        s3 = _get_s3_client()
        s3.delete_object(
            Bucket=bucket,
            Key=ruta_objeto
        )
    except (BotoCoreError, ClientError) as e:
        current_app.logger.exception('Error de Storage de S3:')
        raise RuntimeError('No se pudo establecer conexión con el servidor de almacenamiento. Intente de nuevo más tarde.')
