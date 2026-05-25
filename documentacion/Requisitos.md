Requerimientos para desarrollo web 

La página actualmente fue diseñada para el ingreso, manejo y control de tablas de posiciones y estadísticas del Torneo Exalumnos Salesianos de Manta.

Se requiere una reforma integral tanto visual como funcional, con una línea gráfica más moderna, profesional y dinámica, enfocada en reflejar la identidad de la organización y todos los torneos que realiza.

Objetivo general

Desarrollar una plataforma deportiva moderna que permita:

- Mostrar todos los torneos organizados.
- Gestionar registros de jugadores y equipos.
- Controlar documentación requerida.
- Visualizar estadísticas y tablas de posiciones.
- Mejorar la experiencia del usuario en dispositivos móviles y computadoras.
- Integrar espacios publicitarios para auspiciantes.

---

Requerimientos visuales y diseño

Nueva línea gráfica

Se busca:

- Diseño moderno y deportivo.
- Interfaz limpia y profesional.
- Adaptabilidad para dispositivos móviles (responsive).
- Mejor organización visual de información.
- Uso de banners dinámicos e imágenes deportivas.
- Navegación intuitiva y rápida.

---

Página principal (Home)

Secciones requeridas

Banner principal

Debe incluir:
- Torneos activos.
- Próximos partidos.
- Información destacada.
- Botones de acceso rápido.

---

Sección de torneos

Mostrar todos los torneos organizados mediante:
- Cards o bloques visuales.
- Logo del torneo.
- Categoría.
- Estado del campeonato.
- Acceso a estadísticas y tablas.

---

Resultados y estadísticas rápidas

Visualización rápida de:

- Últimos resultados.
- Próximos encuentros.
- Tabla resumida.
- Líderes estadísticos.

---

Carrusel de auspiciantes

Incluir un espacio dinámico para:

- Logos de patrocinadores.
- Carrusel automático.
- Ubicación sugerida: inicio o pie de página.
- Posibilidad de enlazar a redes sociales o páginas web de auspiciantes.

---

Sistema de registro de jugadores

Registro de jugadores y equipos

El sistema debe permitir:

- Registro de jugadores por parte de cada equipo/delegado.
- Ingreso de información por medio de un delegado del equipo 
Información requerida:
- Nombres completos.
- Número de cédula.
- Fecha de nacimiento.
- Fotografía.
- Número de camiseta.
- Correo
- Contacto.

---

Carga de documentación
Permitir subir archivos como:
- DOCUMENTOS PDF Y JPEG definidos por la organización., 


---

Validación administrativa

El administrador debe poder:
- Aprobar o rechazar registros.
- Verificar documentos.
- Bloquear jugadores incompletos o no habilitados.
- Gestionar estados de aprobación.

---

Panel administrativo
El sistema debe contar con un panel de administración que permita gestionar:

- Torneos.
- Equipos.
- Calendarios.
- Estadísticas.
- Tablas de posiciones.
- Resultados.
- Usuarios y roles.
- Sanciones o novedades.

---

Estadísticas y tablas
Se requiere:

- Actualización automática de tablas.
- Estadísticas por equipo y jugador.
- Ranking.
- Historial de partidos.
- Líderes estadísticos.

---

Experiencia móvil
La plataforma debe estar optimizada para celulares, considerando que la mayoría de usuarios consultará:

- Resultados.
- Horarios.
- Tablas.
- Estadísticas.

---

Funciones adicionales sugeridas
- Sección de noticias y comunicados.
- Integración con redes sociales.
- Perfil individual de equipos.
- Sistema de credenciales o QR.
- Notificaciones futuras por WhatsApp o correo.


## Anotaciones

Falta dominio para subir la página

El logo de la organización debería estar en la página principal
Desde ahí se puede acceder a los distintos torneos

# Preguntas para realizar

Buenas noches, gracias por la espera a mi respuesta, estuve revisando los requisitos que me pidió y me parecen muy detallados, está perfecto, tengo muchas preguntas, puede ir respondiéndolas por partes, mas que nada porque me faltan mas especificaciones del sistema para 
### Importante

¿Ya tienen una web? (por los requisitos y la forma en la que están redactados suena como si ya tuvieran una y quisiera hacer una versión mejorada)

¿Qué tanto alcance tendrá el proyecto? (Será algo local para pocas personas e incluso entiendo que es para los salesianos como tal o será un proyecto que se espera que sea grande)

## 1. Lógica y Formato de los Torneos

Necesito que me explique las reglas del juego y de los torneos como tal

- **¿Qué formatos de torneo manejan habitualmente?** ( investigué un poco y encontré esto, igual si puede indicarme específicamente sería chévere: Eliminación directa, Round Robin/Todos contra todos, o fase de grupos seguida de playoffs)

- **¿Que pasa si toca un desempate en la tabla de posiciones?** (Ej: Diferencia de puntos, puntos a favor, resultado entre ellos, o sorteo)

- **¿Se manejan diferentes categorías en un mismo torneo?** (Ej: Sub-40, Libre, Femenino). ¿Un jugador puede estar en más de una categoría?

- **¿Cómo se gestionan las canchas y horarios?** ¿El sistema debe detectar conflictos (ej: un equipo no puede jugar en dos canchas a la vez) o el administrador lo asigna manualmente?  

## 2. Estadísticas

Esto es mas en base a como funcionan las estadísticas mas que nada porque no he practicado basquet entonces necesitaría que me instruya un poco

- **¿Qué estadísticas individuales se deben registrar por partido?** (Solo puntos, o también: faltas personales, triples, tiros libres, rebotes, asistencias, bloqueos).

- **¿Quién y cuándo ingresa los resultados?** ¿Habrá una persona en la mesa de control con una tablet (por ejemplo, puede ser incluso una computadora) registrando cada punto en vivo, o se subirá el acta final al terminar el partido?

- **¿Existen los algún premio para alguien destacado dentro del torneo, como por ejemplo, el máximo anotador o algo por el estilo?** 

## 3. Flujo de Registro y validación de documentos

Este aspecto será para como se manejarán los documentos

- **¿Cuál es el flujo exacto de aprobación de un jugador?** (Ej: El delegado de equipos sube datos -> Estado "Pendiente" -> Admin revisa -> Estado "Aprobado" o "Rechazado" con comentario).

- **¿Qué documentos son obligatorios y cuáles opcionales?** (Cédula PDF, foto de perfil JPEG, certificado médico, etc.).

- **¿Existe una fecha límite de inscripción?** ¿El sistema debe bloquear las ediciones en la nómina de jugadores luego de x tiempo?

- **¿Cómo se maneja el pago o los registros en si?** ¿Es de libre acceso para cualquiera o se maneja con pagos y deben subir un comprobante de transferencia o el administrador marca manualmente quién ha pagado?

## 4. Roles y permisos

Para aplicar el **Principio de Menor Privilegio**.

- **¿Qué niveles de acceso necesitamos?**
    
    1. **Super Admin:** Control total de todo.
    
    2. **Mesa de Control:** Solo puede anotar puntos en partidos específicos (en caso de que exista).
    
    3. **Delegado:** Solo gestiona su equipo y sus jugadores.
    
    4. **Público:** Solo lectura de estadísticas.
    
- **¿Cómo se recuperan las credenciales?** ¿Se necesita una opción de "olvidé mi contraseña" vía correo electrónico?

## 5. Infraestrucura y diseño

Esto va mas que nada enfocado a la hora del despliegue y el visual
 
- **¿Que colores debería usar la web?** (De ser posible una paleta de colores o solo un par de colores que sean característicos de su organización).

- **¿Cuál es el volumen esperado?** ¿Cuántos equipos y jugadores esperan tener por torneo y que tantos torneos suelen tener activos? (Este punto es importante para poder diseñar la base de datos en consecuencia)

## 6. Historiales y las sugerencias a futuro

Esto va sobre si existe información previa y las sugerencias a futuro que me indicó

- **¿En caso de que me mencione que ya tenía una web es necesario migrar los datos de una web a la otra o en caso de que tengan un excel por ejemplo?**

- **¿Qué tan importante es la sección de noticias?** ¿Será un blog activo o solo comunicados oficiales esporádicos?

- **Sobre las notificaciones de WhatsApp:** ¿Es una prioridad inmediata o una fase 2? (Las APIs oficiales de WhatsApp tienen un costo por lo que habría que tenerlo en cuenta igual podríamos luego revisar esto luego de tener lo importante).
## 7. Almacenamiento

Estas preguntas te ayudarán a definir la infraestructura y los costos del despliegue:

- **¿Que tanto tiempo se debe mantener la documentación almacenada?** ¿Las fotos de las cédulas se borran al finalizar el torneo o se guardan para el próximo año (y lo mismo para los demas documentos que se requieren subir)? 

- **¿Se necesitan datos históricos?** ¿Se busca que el proyecto guarde información de torneos pasados?

- **¿Existe una política de privacidad de datos?** Al manejar fotos y números de cédula, ¿tienen algún protocolo legal que el sistema deba cumplir (encriptación, acceso restringido)?

- Esto es mas como una anotación, para almacenar los documentos y las fotos necesitaremos un almacenamiento S3 y este suele tener un costo por uso, hay algunas opciones y dependiendo de que tanta información se almacenará podemos elegir una e ir revisándolas

- **¿Debe haber un límite en el tamaño de los archivos que se suban y si lo ha cual será?** Para cuando se suban fotos y documentos ya que hay que tenerlo en cuenta para el almacenamiento y sabiendo que tiene un costo mientras mas pesados sean los archivos mas podría costar