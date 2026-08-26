# Fase 3: Estadísticas por Torneo y Categoría

Este plan de implementación aborda el **Bloque C** de las propuestas post-despliegue, que exige un desglose dinámico de las estadísticas de los jugadores.

## Resumen del Cambio
Actualmente el perfil del jugador muestra las estadísticas globales (carrera completa) y permite elegir un Torneo, pero estas se calculan sumando todas las categorías en las que jugó dentro de ese torneo. El objetivo es que los datos puedan segmentarse por Torneo y por Categoría, mediante el recálculo dinámico usando selects acoplados. Adicionalmente, esta fase incluye implementar el mismo nivel de filtrado por categoría para los rankings de estadísticas (goleadores, triplistas, etc.) en la vista pública de cada torneo.

## Reglas de Negocio Clave
1. **Opciones Dinámicas:** En los desplegables *solo* deben salir torneos y categorías en las que el jugador **participó**. 
2. **Exclusión de Torneos Programados:** Los torneos en estado `programado` no generan estadísticas, por lo tanto **deben excluirse** de las opciones del desplegable. Únicamente aplicará para torneos `finalizado` y `en_curso`.

---

## Cambios Propuestos

### Backend

#### 1. `jugador_profile_service.py`
- **Agrupación en Query:** Se agregará `Partido.id_categoria` al bloque `.group_by(...)` de la consulta `stats_por_torneo_raw` para que SQLAlchemy separe los cálculos.
- **Formateo del Diccionario:** En vez de retornar `estadisticas_por_torneo[id_torneo] = stats`, ahora retornará una estructura anidada que contiene tanto el torneo como la categoría:
  ```json
  "estadisticas_por_torneo": {
      "12": { // ID del torneo
          "3": { // ID de la categoría
              "partidos_jugados": 10,
              "puntos_totales": 140,
              // ...
          }
      }
  }
  ```

#### 2. Endpoints de Estadísticas Generales (`stats_bp.py` / `standings.py`)
- **Filtro por Categoría:** Asegurar que los endpoints que devuelven los líderes de estadísticas de un torneo (top goleadores, top triplistas, etc.) soporten el filtrado por categoría (ej. pasando `?id_categoria=X`), agrupando los cálculos a ese nivel.

---

### Frontend

#### 2. `JugadorProfile.tsx`
- **Filtrado por Estado:** Actualizar la generación de opciones del select (`torneosConEstadisticas`) para que se excluyan automáticamente las participaciones de torneos cuyo estado sea `programado`. Solo se listarán `finalizado` y `en_curso`.
- **Nuevo Estado Reactivo:** Añadir el estado `categoriaSeleccionada`.
- **Lógica de Cascada:** Crear una función (ej. `handleTorneoChange`) que al seleccionar un torneo, lea las participaciones del jugador en ese torneo y popule automáticamente el nuevo `select` de categorías.
- **Rutas por Defecto:** 
  - Si se elige el torneo "Global" (carrera entera), el `select` de categorías se deshabilita o se oculta.
  - Si se elige un Torneo específico, se auto-selecciona la primera categoría disponible de ese torneo.
- **Mapeo Visual:** Actualizar `statsMostradas` para leer en profundidad el diccionario del backend usando Optional Chaining: `jugador.estadisticas_por_torneo?.[torneoSeleccionado]?.[categoriaSeleccionada]`.
- **UI:** Renderizar el segundo `<select>` al lado del existente.

#### 3. `TorneoDetail.tsx` (Vista Pública del Torneo)
- **Pestaña de Estadísticas Desglosadas:** Dentro del área de estadísticas del torneo, añadir un selector de categorías.
- **Rankings Específicos:** Al cambiar la categoría, el componente solicitará o filtrará los líderes (Máximos Goleadores, Triplistas, etc.) de manera que solo se muestren los jugadores relevantes para esa categoría en particular.

## Plan de Verificación (Pruebas Manuales)
1. Ingresar al perfil de un jugador (público) que tenga participaciones en torneos con estado `en_curso` o `finalizado`.
2. Verificar que los torneos `programados` en los que esté el jugador **no** aparezcan en el filtro de estadísticas (aunque sí saldrán en su historial de participaciones).
3. Cambiar de Torneo y observar cómo aparece el selector de Categorías poblado únicamente con las categorías de ese torneo específico donde el jugador haya participado.
4. Alternar entre Categorías y ver la actualización instantánea en las tarjetas (Bento Grid) de estadísticas.
5. Ir a la página pública de un Torneo (`/torneos/:id`), abrir la sección de estadísticas, seleccionar una categoría y verificar que los rankings (goleadores, triplistas) correspondan solo a esa categoría.
