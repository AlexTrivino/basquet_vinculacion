# Protocolo Exhaustivo de Pruebas

Este documento detalla las pruebas manuales rigurosas que deben ejecutarse para verificar la integridad del sistema tras cada fase de implementación. 

Se asume que la base de datos se ha inicializado con el script `seed_database.py`, el cual incluye:
- Delegados del 1 al 5 **con historial y 1 equipo** (`delegado1@test.com`, `delegado2@test.com`, etc.).
- Delegados del 6 al 9 **nuevos y sin equipos** (`delegado6@test.com`, etc.).
- La contraseña para todos los delegados y administradores semilla es: `sadmin`.
- Torneos en curso y un "Torneo Clausura 2026" programado (vacío) para probar la reinscripción.

---

## FASE 1: Independencia de Equipos y Flujo de Reinscripción

El objetivo crítico de esta fase es asegurar que el principio de **"Un Equipo por Delegado"** se respete bajo cualquier circunstancia y que **no exista destrucción de datos históricos** cuando un equipo es rechazado en un nuevo torneo.

### 🧪 Prueba 1.1: Bloqueo de Límite de Equipos (Restricción de Negocio)
**Objetivo:** Verificar que un delegado con un equipo activo sea bloqueado absolutamente si intenta inscribir o registrar un equipo nuevo desde cero.
1. **Acción:** Inicia sesión con `delegado1@test.com`.
2. **Acción:** Ve al Dashboard (`/delegado/dashboard`).
3. **Verificación Visual:** La tarjeta del equipo actual ("Delfines BC") debe ser la única visible. El botón "Inscribir Nuevo Equipo" NO debe existir. Tampoco debe existir el selector de equipos (dropdown).
4. **Intento de Bypass por URL:** En la barra de direcciones del navegador, fuerza la navegación a `http://localhost:5173/delegado/inscripcion`.
5. **Verificación Rigurosa:** El sistema debe capturar el intento y renderizar un componente de estado vacío (*EmptyState*) con el mensaje "Límite de Equipos Alcanzado", impidiendo el acceso al formulario.

### 🧪 Prueba 1.2: Detección y Banner de Reinscripción Activa
**Objetivo:** Verificar que el sistema cruza los datos de torneos abiertos vs. inscripciones del equipo para invitar a la reinscripción.
1. **Condición Inicial:** Existe el "Torneo Clausura 2026" en estado "programado". El equipo de `delegado1@test.com` ("Delfines BC") NO está en ese torneo.
2. **Acción:** Inicia sesión con `delegado1@test.com`. Ve al Dashboard.
3. **Verificación Visual:** Debe renderizarse un Banner destacado en la parte superior anunciando: *"¡Nueva Temporada Disponible!"* (Torneo Clausura 2026).
4. **Verificación de Acción:** El Banner debe contener un botón activo de "Reinscribir Equipo".

### 🧪 Prueba 1.3: Flujo de Reinscripción y Clonación Exitosa
**Objetivo:** Comprobar que el endpoint `POST /api/inscripciones/reinscribir` crea un borrador de inscripción y copia los jugadores con éxito.
1. **Acción:** Haz clic en "Reinscribir Equipo" desde el banner.
2. **Formulario:** En el Wizard, selecciona una Categoría (ej. Senior Libre).
3. **Toggle Clave:** Asegúrate de que la opción **"Importar jugadores del torneo anterior"** esté MARCADA (activa).
4. **Archivo:** Sube un PDF o JPG cualquiera (simulando comprobante) y haz clic en "Siguiente Paso".
5. **Verificación de Estado:** Serás redirigido al Dashboard. La nueva inscripción al Clausura 2026 debe aparecer en estado **BORRADOR**.
6. **Verificación de Clonación:** Haz clic en "Continuar Registro de Jugadores". La tabla del roster debe aparecer **pre-llenada** con al menos 10 jugadores (los mismos de la temporada pasada). Ninguno de sus documentos debe haberse perdido.
7. **Finalización:** Pulsa el botón verde para Enviar Inscripción al administrador. El estado en el dashboard cambiará a **PENDIENTE**.

### 🧪 Prueba 1.4: Protección de Datos Históricos ante Rechazos (Caso Crítico 🚨)
**Objetivo:** Garantizar que rechazar una reinscripción NO elimina el equipo completo ni borra su historial de participaciones anteriores. 
*(Si esta prueba falla, hay riesgo de pérdida de datos en producción).*
1. **Acción Administrativa:** Inicia sesión como `admin@test.com`. Ve al Panel de Auditoría (`/admin/auditoria`).
2. **Acción:** Localiza la inscripción *Pendiente* de "Delfines BC" para el "Torneo Clausura 2026" (la que acabas de enviar en la Prueba 1.3).
3. **Acción Crítica:** Haz clic en **Rechazar**, escribe un motivo (ej. "Comprobante falso") y confirma.
4. **Verificación Administrativa:** Navega a "Equipos" (`/admin/equipos`). Busca "Delfines BC". **El equipo debe seguir existiendo** en la base de datos.
5. **Verificación de Usuario:** Inicia sesión nuevamente con `delegado1@test.com` y ve al Dashboard. 
6. **Verificación Rigurosa:** Tu equipo "Delfines BC" debe estar intacto, mostrando que sigue inscrito en los torneos anteriores (ej. "Copa Verano 2026"). Solo ha desaparecido la ficha del "Torneo Clausura". No se ha perdido ningún jugador histórico.

### 🧪 Prueba 1.5: Eliminación Completa ante Rechazos de Equipos Nuevos
**Objetivo:** Garantizar que la base de datos no se llene de "equipos basura" si un equipo *totalmente nuevo* es rechazado en su primer torneo.
1. **Acción:** Inicia sesión con `delegado6@test.com` (este delegado NO tiene equipos en la base de datos).
2. **Acción:** Inscribe un equipo desde cero, llámalo "Los Novatos". Completa el flujo, sube comprobante, añade 10 jugadores y envía la inscripción a estado **Pendiente**.
3. **Acción Administrativa:** Inicia sesión como `admin@test.com`. Ve a Auditoría.
4. **Acción Crítica:** Rechaza la inscripción de "Los Novatos".
5. **Verificación de Limpieza:** Navega a `/admin/equipos`. El equipo "Los Novatos" **no debe existir** en el listado.
6. **Verificación de Usuario:** Inicia sesión con `delegado6@test.com`. Al ingresar, el Dashboard debe estar vacío y mostrarte la pantalla inicial para volver a empezar desde cero ("Primer Paso: Inscribe tu Equipo").

---

*(Este documento se actualizará con las pruebas de las siguientes fases a medida que se vayan implementando).*

## FASE 2: Estados de Torneo y Retiros No Destructivos

*(Pendiente de ejecución de pruebas tras implementación completa del Frontend)*

### 🧪 Prueba 2.1: Bloqueo de Plantilla en Torneo "En Curso"
**Objetivo:** Evitar que los delegados modifiquen sus plantillas cuando el torneo ya inició.
1. Inicia sesión como Delegado 1 (cuyo equipo está en un torneo activo/en_curso).
2. Navega a "Mi Plantilla".
3. **Resultado esperado:**
   - Los botones "Añadir Jugador", "Confirmar Plantilla" y el icono de lápiz para editar deben **desaparecer**.
   - Se debe mostrar el banner azul informativo: "Torneo En Curso... La edición está bloqueada".

### 🧪 Prueba 2.2: Retiro de equipo desde Administración
**Objetivo:** Verificar que retirar un equipo cancele sus partidos sin destruir su historial pasado.
1. Inicia sesión como Super Admin.
2. Navega a la vista de "Auditoría".
3. Haz clic en la pestaña "Retirados" o busca un equipo en "Aprobados" (o filtra por un torneo en curso).
4. Encuentra un equipo "Aprobado" y haz clic en **Retirar**. Confirma el modal rojo.
5. **Resultado esperado:**
   - El estado de la inscripción del equipo debe cambiar a **Retirado**.
   - Los partidos que estuvieran en estado `programado` donde participaba este equipo deben desaparecer del calendario para ser reagendados.
   - Sus partidos finalizados con `resultado` o estadísticas previas **no** deben alterarse.
   - El equipo no debe borrarse de la tabla `equipos`.

---

## FASE 4: CRUD de Torneos, Subida de Excel y Remodelación Pública

### Escenario 4.1: Anular Torneo desde Administración
**Objetivo:** Validar que un torneo puede ser anulado (soft-delete) y que deja de ser visible para el público, pero se mantiene en base de datos.
1. Inicia sesión como `Super Admin`.
2. Dirígete a la sección **Torneos**.
3. Identifica un torneo de prueba y presiona el botón **Anular** (ícono de papelera roja). Confirma la advertencia.
4. **Resultado esperado UI Admin:** El torneo cambia su badge a `Anulado` y el botón de anular se deshabilita.
5. **Resultado esperado Vista Pública:** Cierra sesión o ve a una ventana de incógnito. Al entrar a la Landing (Home) o buscar el torneo en "Ver torneos anteriores", este **no debe aparecer**. Al intentar acceder directamente vía `/torneos/ID`, debe dar error 404 o un mensaje de torneo no encontrado.

### Escenario 4.2: Gestión de Categorías "En Vivo" (Creación y Eliminación Segura)
**Objetivo:** Asegurar que se puedan agregar y quitar categorías a un torneo ya creado, siempre y cuando no existan equipos inscritos.
1. Como `Super Admin`, edita un torneo existente que no tenga equipos.
2. Agrega una nueva categoría (ej. Sub-18 Masculino). Se guardará inmediatamente sin presionar "Guardar Torneo".
3. **Resultado esperado API:** Debe reflejarse un toast de éxito y aparecer en la lista.
4. Elimina la categoría recién creada. Debe confirmar la eliminación y desaparecer.
5. *(Opcional)* Intenta eliminar una categoría que **sí** tiene equipos inscritos. El backend debe rechazar la solicitud con `409 Conflict` (o un error similar) y no debe borrarse.

### Escenario 4.3: Subida y Validación del Calendario Oficial (Excel)
**Objetivo:** Verificar que el sistema permite la subida del Excel y restringe tipos de archivos maliciosos vía "magic bytes".
1. En el modal de edición del torneo, localiza el campo de "Calendario de Juegos (Excel)".
2. Sube un archivo malicioso (ej. un `.txt` renombrado a `.xlsx`).
3. **Resultado esperado:** El sistema debe rechazar el archivo y lanzar un error indicando "Tipo de archivo no permitido".
4. Sube un archivo de Excel real (`.xlsx`).
5. **Resultado esperado:** Se sube correctamente, el componente actualiza su UI para mostrar el link del archivo actual, y al visitar la vista pública del torneo, debe aparecer el botón "Descargar Calendario" en la cabecera.
