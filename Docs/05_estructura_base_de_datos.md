# Estructura de la Base de Datos (SQLAlchemy)

Este documento detalla el esquema relacional gestionado por SQLAlchemy en Flask sobre PostgreSQL.

> **Soft Delete:** Todas las entidades con campo `estado` implementan un método de clase `.activos()` que pre-filtra excluyendo registros inactivos (lógicamente eliminados).

---

## 1. Usuarios
*Enlazado directamente con los usuarios de Supabase Auth.*

* `id_usuario`: UUID (Primary Key)
* `nombre`: String(100), Not Null
* `correo`: String(150), Unique, Not Null
* `rol`: String(20), Default='delegado' (Opciones: `delegado`, `super_admin`)
* `estado`: String(20), Default='activo'
* `created_at`, `updated_at`: DateTime

**Relaciones:** 1:N hacia `Equipos` (Un delegado puede gestionar varios equipos).

---

## 2. Torneos
* `id_torneo`: Integer (Primary Key, Auto-increment)
* `nombre`: String(100), Not Null
* `fecha_inicio`: Date, Not Null
* `fecha_fin`: Date, Not Null
* `estado`: String(20), Default='programado'
* `created_at`, `updated_at`: DateTime

**Relaciones:** 1:N hacia `Partidos`, `Inscripciones`, `Documentacion`, `Plantillas`, `Patrocinadores_torneos`.

---

## 3. Equipos
* `id_equipo`: Integer (Primary Key, Auto-increment)
* `nombre_equipo`: String(100), Not Null
* `estado`: String(20), Default='activo'
* `url_logo`, `url_foto_equipo`: Text, Nullable
* `id_usuario`: UUID (Foreign Key -> Usuarios.id_usuario, Not Null)

**Relaciones:** Obligatorio pertenecer a un `Usuario`. 1:N hacia `Inscripciones`, `Plantillas`, `Partidos`.

---

## 4. Categorías
* `id_categoria`: Integer (Primary Key, Auto-increment)
* `nombre_categoria`: String(50), Not Null
* `genero_categoria`: String(20), Not Null
* `edad_minima`: Integer, Default=0
* `edad_maxima`: Integer, Nullable

---

## 5. Inscripciones
*El núcleo del sistema que vincula un Equipo con un Torneo en una Categoría.*

* `id_inscripcion`: Integer (Primary Key, Auto-increment)
* `fecha_inscripcion`: DateTime
* `estado_inscripcion`: String(20), Default='pendiente'
* `grupo`: String(10), Nullable
* `url_comprobante_pago`: Text, Nullable
* `id_torneo`: Integer (FK -> Torneos, Not Null)
* `id_equipo`: Integer (FK -> Equipos, Not Null)
* `id_categoria`: Integer (FK -> Categorias, Not Null)

**Restricciones:** `UNIQUE(id_torneo, id_equipo, id_categoria)` (Impide doble inscripción).

---

## 6. Jugadores
* `id_jugador`: Integer (Primary Key, Auto-increment)
* `nombres`, `apellidos`: String(100), Not Null
* `genero`: String(20), Not Null
* `documento_identificacion`: String(20), Unique, Not Null
* `fecha_nacimiento`: Date, Not Null
* `url_foto`: Text, Nullable
* `correo`: String(150), Nullable
* `telefono`: String(20), Nullable
* `estado`: String(20), Default='activo'

**Relaciones:** 1:N hacia `Documentos_jugadores`, `Plantillas`, `Sanciones`, `Estadisticas`.

---

## 7. Plantillas (Roster Oficial)
*Relaciona a un Jugador con un Equipo en un Torneo específico.*

* `id_plantilla`: Integer (Primary Key)
* `numero_camiseta`: Integer, Nullable
* `estado`: String(20), Default='activo'
* `id_jugador`: Integer (FK -> Jugadores, Not Null)
* `id_torneo`: Integer (FK -> Torneos, Not Null)
* `id_equipo`: Integer (FK -> Equipos, Not Null)
* `id_categoria`: Integer (FK -> Categorias, Not Null) — *Garantiza métricas precisas por categoría.*

---

## 8. Partidos
* `id_partido`: Integer (Primary Key)
* `fecha`: Date, Not Null
* `hora`: Time, Not Null
* `estado`: String(20), Default='programado'
* `marcador_local`, `marcador_visitante`: Integer, Default=0
* `fase`: String(50), Not Null
* `ubicacion`: String(150), Default='Coliseo Pablo Delgado Álava'
* `url_planilla_fiba`: Text, Nullable
* `id_torneo`: Integer (FK -> Torneos, Not Null)
* `id_equipo_local`: Integer (FK -> Equipos, Not Null)
* `id_equipo_visitante`: Integer (FK -> Equipos, Not Null)

**Relaciones:** 1:N hacia `Sanciones`, `Estadisticas`.

---

## 9. Estadísticas
*Box score detallado por jugador en cada partido.*

* `id_estadistica`: Integer (Primary Key)
* `puntos_anotados`: Integer, Default=0
* `faltas_cometidas`: Integer, Default=0
* `triples_anotados`: Integer, Default=0
* `rebotes`: Integer, Default=0
* `asistencias`: Integer, Default=0
* `id_partido`: Integer (FK -> Partidos, Not Null)
* `id_jugador`: Integer (FK -> Jugadores, Not Null)

---

## 10. Sanciones
* `id_sancion`: Integer (Primary Key)
* `motivo`: Text, Not Null
* `fecha`: Date, Not Null
* `estado`: String(20), Default='activa'
* `id_jugador`: Integer (FK -> Jugadores, Not Null)
* `id_partido`: Integer (FK -> Partidos, Not Null)

---

## Otras Tablas Complementarias

- **Documentación:** Almacena reglas o resoluciones (FK: `id_torneo`).
- **Documentos_jugadores:** Cédulas y actas individuales (FK: `id_jugador`).
- **Patrocinadores:** Catálogo de logos y nombres.
- **Patrocinadores_torneos:** Tabla pivote que asocia patrocinadores activos a un torneo.
