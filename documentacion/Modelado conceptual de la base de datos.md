 Datos obtenidos de: [[Requisitos Borrador]]
# Tablas / entidades

# Esquema de Base de Datos para SQLAlchemy (Flask) - Cardinalidad y Logs

## Usuarios
* `id_usuario`: UUID (Primary Key) - *Enlazado con Supabase Auth*
* `nombre`: String(100), Not Null
* `correo`: String(150), Unique, Not Null
* `rol`: String(20), Default='delegado'
* `estado`: String(20), Default='activo'
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Hacia `Equipos`: **1 a Muchos (1:N)**. 
  * *Cardinalidad:* **Opcional Muchos (O<)**. Un usuario puede crearse y tener 0 equipos inscritos, o puede tener muchos.

## Torneos
* `id_torneo`: Integer (Primary Key, Auto-increment)
* `nombre`: String(100), Not Null
* `fecha_inicio`: Date, Not Null
* `fecha_fin`: Date, Not Null
* `estado`: String(20), Default='programado'
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Hacia `Partidos`, `Inscripciones`, `Documentacion`, `Plantillas`, `Patrocinadores_torneos`: **1 a Muchos (1:N)**.
  * *Cardinalidad:* **Opcional Muchos (O<)**. Un torneo recién creado empieza sin partidos ni equipos, pero irá acumulando muchos.

## Jugadores
* `id_jugador`: Integer (Primary Key, Auto-increment)
* `nombres`: String(100), Not Null
* `apellidos`: String(100), Not Null
* `genero`: String(20), Not Null
* `documento_identificacion`: String(20), Unique, Not Null
* `fecha_nacimiento`: Date, Not Null
* `url_foto`: Text, Nullable
* `correo`: String(150), Nullable
* `telefono`: String(20), Nullable
* `estado`: String(20), Default='activo'
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Hacia `Documentos_jugadores`, `Plantillas`, `Sanciones`, `Estadisticas`: **1 a Muchos (1:N)**.
  * *Cardinalidad:* **Opcional Muchos (O<)**. Un jugador puede existir en el sistema sin tener faltas, estadísticas o sanciones previas.

## Equipos
* `id_equipo`: Integer (Primary Key, Auto-increment)
* `nombre_equipo`: String(100), Not Null
* `estado`: String(20), Default='activo'
* `url_logo`: Text, Nullable
* `url_foto_equipo`: Text, Nullable
* `id_usuario`: UUID (Foreign Key -> Usuarios.id_usuario, Not Null)
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Desde `Usuarios`: **Mandatorio Uno (||)**. El equipo NO puede existir sin un usuario/delegado responsable.
* Hacia `Inscripciones`, `Plantillas`, `Partidos`: **1 a Muchos (1:N)**.
  * *Cardinalidad:* **Opcional Muchos (O<)**.

## Documentacion
* `id_documentacion`: Integer (Primary Key, Auto-increment)
* `titulo`: String(150), Not Null
* `url_documento`: Text, Not Null
* `id_torneo`: Integer (Foreign Key -> Torneos.id_torneo, Not Null)
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Desde `Torneos`: **Mandatorio Uno (||)**. El documento debe pertenecer obligatoriamente a un torneo existente.

## Documentos_jugadores
* `id_documentos_jugador`: Integer (Primary Key, Auto-increment)
* `url_documento`: Text, Not Null
* `tipo_documento`: String(50), Not Null
* `estado_validacion`: String(20), Default='pendiente'
* `id_jugador`: Integer (Foreign Key -> Jugadores.id_jugador, Not Null)
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Desde `Jugadores`: **Mandatorio Uno (||)**. El documento tiene que ser obligatoriamente de un jugador validado.

## Partidos
* `id_partido`: Integer (Primary Key, Auto-increment)
* `fecha`: Date, Not Null
* `hora`: Time, Not Null
* `estado`: String(20), Default='programado'
* `marcador_local`: Integer, Default=0
* `marcador_visitante`: Integer, Default=0
* `fase`: String(50), Not Null
* `ubicacion`: String(150), Default='Coliseo Pablo Delgado Álava'
* `url_planilla_fiba`: Text, Nullable
* `id_torneo`: Integer (Foreign Key -> Torneos.id_torneo, Not Null)
* `id_equipo_local`: Integer (Foreign Key -> Equipos.id_equipo, Not Null)
* `id_equipo_visitante`: Integer (Foreign Key -> Equipos.id_equipo, Not Null)
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Desde `Torneos` y `Equipos`: **Mandatorio Uno (||)**. Un partido no puede jugarse sin un torneo y sin dos equipos asignados.
* Hacia `Sanciones`, `Estadisticas`: **1 a Muchos (1:N)**.
  * *Cardinalidad:* **Opcional Muchos (O<)**. Puede haber partidos donde nadie anote triples o reciba sanciones.

## Sanciones
* `id_sancion`: Integer (Primary Key, Auto-increment)
* `motivo`: Text, Not Null
* `fecha`: Date, Not Null
* `estado`: String(20), Default='activa'
* `id_jugador`: Integer (Foreign Key -> Jugadores.id_jugador, Not Null)
* `id_partido`: Integer (Foreign Key -> Partidos.id_partido, Not Null)
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Desde `Jugadores` y `Partidos`: **Mandatorio Uno (||)**. Toda sanción debe atarse estrictamente a quién la cometió y en qué partido.

## Patrocinadores
* `id_patrocinador`: Integer (Primary Key, Auto-increment)
* `nombre_patrocinador`: String(100), Not Null
* `url_logo_patrocinador`: Text, Nullable
* `url_imagen_promocional`: Text, Nullable
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Hacia `Patrocinadores_torneos`: **1 a Muchos (1:N)** - **Opcional Muchos (O<)**.

## Patrocinadores_torneos
* `id_patrocinador_torneo`: Integer (Primary Key, Auto-increment)
* `id_patrocinador`: Integer (Foreign Key -> Patrocinadores.id_patrocinador, Not Null)
* `id_torneo`: Integer (Foreign Key -> Torneos.id_torneo, Not Null)
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Desde `Patrocinadores` y `Torneos`: **Mandatorio Uno (||)**.

## Categorias
* `id_categoria`: Integer (Primary Key, Auto-increment)
* `nombre_categoria`: String(50), Not Null
* `genero_categoria`: String(20), Not Null
* `edad_minima`: Integer, Default=0
* `edad_maxima`: Integer, Nullable
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Hacia `Inscripciones`: **1 a Muchos (1:N)** - **Opcional Muchos (O<)**.

## Estadisticas
* `id_estadistica`: Integer (Primary Key, Auto-increment)
* `puntos_anotados`: Integer, Default=0
* `faltas_cometidas`: Integer, Default=0
* `triples_anotados`: Integer, Default=0
* `rebotes`: Integer, Default=0
* `asistencias`: Integer, Default=0
* `id_partido`: Integer (Foreign Key -> Partidos.id_partido, Not Null)
* `id_jugador`: Integer (Foreign Key -> Jugadores.id_jugador, Not Null)
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Desde `Partidos` y `Jugadores`: **Mandatorio Uno (||)**. No existen estadísticas fantasmas.

## Inscripciones
* `id_inscripcion`: Integer (Primary Key, Auto-increment)
* `fecha_inscripcion`: DateTime, Default=now()
* `estado_inscripcion`: String(20), Default='pendiente'
* `grupo`: String(10), Nullable
* `url_comprobante_pago`: Text, Nullable
* `id_torneo`: Integer (Foreign Key -> Torneos.id_torneo, Not Null)
* `id_equipo`: Integer (Foreign Key -> Equipos.id_equipo, Not Null)
* `id_categoria`: Integer (Foreign Key -> Categorias.id_categoria, Not Null)
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Desde `Torneos`, `Equipos`, `Categorias`: **Mandatorio Uno (||)**. Toda inscripción exige obligatoriamente las tres referencias.

## Plantillas
* `id_plantilla`: Integer (Primary Key, Auto-increment)
* `numero_camiseta`: Integer, Nullable
* `id_jugador`: Integer (Foreign Key -> Jugadores.id_jugador, Not Null)
* `id_torneo`: Integer (Foreign Key -> Torneos.id_torneo, Not Null)
* `id_equipo`: Integer (Foreign Key -> Equipos.id_equipo, Not Null)
* `estado`: String(20), Default='activo'
* `created_at`: DateTime, Default=now()
* `updated_at`: DateTime, Default=now(), onupdate=now()
**Relaciones:**
* Desde `Jugadores`, `Torneos`, `Equipos`: **Mandatorio Uno (||)**. Un registro en la plantilla oficial exige estos tres componentes sin excepción.