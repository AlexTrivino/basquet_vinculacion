# Análisis del Bug de Plantilla (Discrepancia entre Dashboard y Wizard)

El análisis confirma el problema de la discrepancia de jugadores, el cual se origina a raíz de la funcionalidad de **reinscripciones** de equipos en nuevos torneos.

## ¿Qué está pasando exactamente?

1. **El contexto del Delegado:** Hace unas semanas, el delegado inscribió a su equipo y agregó 9 jugadores a la plantilla. Esos 9 jugadores quedaron registrados en la base de datos **atados al torneo y categoría anteriores**.
2. **La nueva inscripción:** Ahora, el delegado inició una **nueva solicitud (borrador)** para un torneo diferente.
3. **El Dashboard (10 Jugadores):** Cuando el delegado está en el Dashboard, el componente de "Plantilla Oficial" detecta que la inscripción actual es un borrador. Como no está aprobada, el filtro de torneos cae por defecto en "Todos los Torneos (Histórico)". Por lo tanto, el sistema busca todos los jugadores que han jugado para ese equipo en la historia, sumando los 9 del torneo anterior + 1 nuevo, mostrando un total de **10 PLANTILLA**.
4. **El Paso 2 (1 Jugador):** Cuando el delegado entra a "Reanudar Solicitud" (Paso 2 del Wizard), el sistema se vuelve estricto. **Solo muestra los jugadores registrados específicamente para el NUEVO torneo y la NUEVA categoría del borrador**. Como los 9 jugadores históricos pertenecen al torneo viejo, no aparecen aquí. Solo aparece el 1 jugador nuevo que el delegado acaba de agregar.

**Conclusión:** El sistema está funcionando como fue programado (aislando las plantillas por torneo), pero la experiencia de usuario (UX) es muy confusa porque el delegado asume que sus jugadores anteriores "pasan automáticamente" al nuevo torneo, o no entiende por qué el Dashboard le muestra 10 y el formulario le muestra 1.

---

## Opciones de Solución

Para arreglar esto de forma definitiva y darle una buena experiencia al delegado, existen los siguientes caminos posibles:

### Opción 1: Botón de "Importar Jugadores" en Frontend (Recomendada)
En el Paso 2 de la inscripción, agregar un botón llamativo que diga **"Importar jugadores anteriores"**. Al hacer clic, se abre un modal con la lista de los jugadores históricos del equipo. El delegado puede marcar con un checkbox los que van a continuar en este nuevo torneo y se importan rápidamente (solo pide que confirme el dorsal para cada uno).
*(Esta opción es la más recomendada porque da control total, previene llenar la BD de datos basura si no todos juegan este año, y respeta la validación de edad de la nueva categoría).*

### Opción 2: Clonado Automático en Backend
Cuando el delegado inicia el Paso 1 y crea un borrador de reinscripción, el Backend detecta si el equipo tiene una plantilla previa. De ser así, **clona automáticamente a todos los jugadores históricos** al nuevo borrador. 
*(El riesgo de esta opción es que si la nueva categoría tiene reglas de edad distintas, el clonado podría fallar o meter jugadores inválidos, además asume que siempre juegan los mismos).*

### Opción 3: Claridad en la UI (Solución rápida temporal)
Modificar el Dashboard para que en lugar de "10 PLANTILLA" diga "10 HISTÓRICO", y poner un mensaje de alerta en el Paso 2 que diga: *"Este es un nuevo torneo. Tus jugadores del torneo anterior ya están en el sistema, solo digita sus cédulas para importarlos"*.
