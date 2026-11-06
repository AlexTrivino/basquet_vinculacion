# Fase 11 · Seguridad: OWASP Top 10:2025

## Problema

Con la migración terminada se revisó el backend, el frontend, los scripts y las dependencias contra el OWASP Top 10:2025. El registro es público: cualquiera con un correo crea una cuenta y el trigger de Supabase la deja como delegado activo, así que lo que puede hacer un delegado lo puede hacer cualquiera. El informe completo, con lo que no está en el repositorio (Supabase, nginx, el servidor), está en [informe.md](informe.md).

## Qué entrega

- **A01 · Archivos del bucket.** El alta y la edición de jugadores ya no aceptan `url_foto`, `url_cedula` ni `url_acta_bachiller` (solo las escriben las rutas de subida; mandarlos da 422 como cualquier campo desconocido). Hoy un delegado puede guardar ahí cualquier ruta y, al dar de baja al jugador o reemplazar el documento, el backend la borra con la llave `service_role`. `borrar_archivo` además solo borra claves del bucket propio (la URL pública propia o la clave suelta, con los caracteres que deja `secure_filename` y sin `..`): lo demás se ignora con un aviso en el log.
- **A01 · Inscripciones de equipos ajenos.** `POST /api/inscripciones` y `/reinscribir` exigen que el delegado sea dueño del equipo (403). Hoy inscribe cualquier equipo, le abre un borrador al dueño (que ya no puede abrir el suyo), copia su plantilla y recibe el nombre y el correo del dueño en la respuesta.
- **A01 · Datos personales por cédula.** `GET /api/jugadores/buscar` y el 409 de `POST /api/jugadores` dan los datos completos solo al super_admin y al delegado del jugador, como la ficha (`GET /api/jugadores/<id>`). Los demás reciben lo que el asistente necesita para vincularlo: nombre, género, foto, estado, cédula y fecha de nacimiento; sin teléfono, correo ni enlaces a la cédula y el acta. En la plantilla, el teléfono deja de ser obligatorio al vincular un jugador que ya existe (no se manda).
- **A01 · Cuentas inactivas.** `/api/usuarios/me` exige una cuenta activa, como el resto de la API: una cuenta inactiva recibe 403 y un token de un usuario que no está en `usuarios`, 401. Al iniciar sesión se muestra el mensaje del backend. `PUT /api/usuarios/me` rechaza (422) un nombre vacío, que no sea texto o de más de 100 caracteres (hoy se guarda vacío o la base da 500).
- **A04 · JWT.** La verificación con JWKS acepta solo ES256 y RS256 (HS256 solo con el secreto), el cliente JWKS espera 5 s como máximo y PyJWT pasa a 2.15.1.
- **A05 · Marcado en el PDF.** Los textos que entran a los párrafos de la planilla (torneo, fase, ubicación y equipos) se escapan: hoy un nombre con `<` o `&` rompe la planilla y uno con `<img src=…>` le hace leer al servidor un archivo o una URL.
- **A06 · Inscripción completa.** `POST /api/inscripciones/completa` revisa que el torneo esté programado, como el alta normal (422), y que el torneo y la categoría sean números (400; hoy, 500).
- **A06 · Scripts que borran datos.** `reset_database.py` vuelve a pedir `BORRAR TODO` (la pregunta estaba comentada: corría sin confirmar) y `clean_partidos.py` también la pide. `seed_database.py` sin argumento y sin terminal ya no hace el seed completo (crea un super_admin de prueba con contraseña conocida), y la opción 4 pide las contraseñas de producción con `getpass` en vez de tenerlas escritas. Se borran `confirm.txt` (contestaba la confirmación), `seed_log.txt` y `test_error.py`.
- **A09 · Registro.** Cada respuesta 401 y 403 deja una línea en el log con el método, la ruta, la IP del cliente (con `ProxyFix`, detrás de nginx) y el código de error.
- **A10 · Errores.** El manejador global deja pasar los errores HTTP con su código (un archivo de más de 5 MB da 413, no 500); `isdigit()` pasa a `isdecimal()` en los parámetros (`?id_categoria=²` daba 500) y la cédula y el teléfono solo aceptan dígitos ASCII; las llamadas a Storage esperan 30 s como máximo y sus errores de red no tumban el hilo de borrado.
- **A02 · Cabeceras.** Toda respuesta de la API lleva `X-Content-Type-Options: nosniff`, y las de pedidos con token, `Cache-Control: no-store`.
- **A03 · Dependencias.** Fuera de `requirements.txt` lo que no se importa (boto3, botocore, s3transfer, jmespath, urllib3, python-dateutil, six y marshmallow-sqlalchemy); cryptography 50.0.2, flask-cors 6.0.5, PyJWT 2.15.1, python-dotenv 1.2.4 y Werkzeug 3.1.9; en el frontend, `npm audit fix`; `deploy.sh` instala con `npm ci` (el lockfile manda).

## Fuera de alcance

- Lo que vive fuera del repositorio (RLS de las tablas en Supabase, bucket público, cabeceras y límites en nginx, gunicorn en `127.0.0.1`, rotar las contraseñas que estuvieron en el código, que las cuentas nuevas no nazcan activas): queda en el informe con cómo comprobarlo y arreglarlo.
- Rediseños: un jugador es uno solo para todos los equipos, así que agregarlo a una plantilla propia da acceso a sus datos y documentos; la plantilla se puede cambiar con el torneo en curso. Están en el informe.
- Límite de pedidos por IP: va en nginx (`limit_req`), anotado en el informe.

## Criterios de aceptación

- [x] Cada arreglo tiene una prueba que falla sin él.
- [x] Las referencias de contrato que cambian lo hacen a propósito y están listadas en el plan.
- [x] `pip-audit` y `npm audit --omit=dev` sin vulnerabilidades conocidas.
- [x] `pytest`, `npm test`, `npm run build` y la prueba de humo en verde.
