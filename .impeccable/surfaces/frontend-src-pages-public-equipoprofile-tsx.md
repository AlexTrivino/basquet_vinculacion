---
version: 1
slug: "frontend-src-pages-public-equipoprofile-tsx"
primary_target: "frontend/src/pages/public/EquipoProfile.tsx"
related_targets: ["frontend/src/components/Navbar.tsx","frontend/src/index.css"]
---

## Alcance

Perfil de equipo `/equipos/:id` (modo Read). El mismo componente se muestra en el panel del delegado (`/delegado/dashboard`, con `teamId` y `dashboardStatus`); el usuario pidió el mismo diseño oscuro en ambos lugares. Pasa del shell claro al mundo «cartelera» de DESIGN.md.

## Visitante y tarea

- Aficionados y familias: reconocer el equipo, saber cuándo juega, ver a sus jugadores y cómo le fue.
- Delegado dueño y super_admin: cambiar escudo y portada; el super_admin además puede desactivar el equipo.
- Prueba: solo datos del API (equipo, plantillas, partidos, inscripciones públicas). Datos reales de referencia: equipo 19 con 12 jugadores (11 con foto tipo carnet), 3 partidos y 1 edición.
- Se conserva: filtros de plantilla por torneo y categoría, historial paginado de 3 en 3, enlaces a jugadores, rivales y torneos, aviso de equipo inactivo, estados vacíos y de error.

## Direction contract

THESIS: La página del equipo es el álbum de cromos de su temporada: los jugadores son las estrellas, coleccionados con retrato, dorsal grande y nombre, y el próximo partido llega como un boleto. Rechaza el perfil genérico de portada + fila de métricas + tarjetas iguales con nombres truncados.

OWN-WORLD: Noche marino continua con la marca de agua; portada con la foto del equipo (o la del coliseo si no tiene) bajo velo marino; medallón blanco con anillo oro para el escudo; nombre en Cinzel crema. El cromo: bandeja marino claro con filete oro al 25 % y relleno de 6 px (doble bisel), retrato 3:4 recortado al rostro, dorsal en numerales Cinzel contorneados en oro sobre un degradado marino, apellidos en Cinzel crema y nombres en Inter pizarra. Celeste solo para enlaces, filtros y foco.

STORY: El aficionado reconoce el escudo y el nombre, ve en una línea la categoría, el torneo y el balance de la temporada, y el boleto le dice contra quién, qué día y a qué hora juega. Baja y recorre el álbum; un toque abre la ficha del jugador. Al final consulta los resultados, la agenda y las ediciones disputadas.

FIRST VIEWPORT: Portada de ~27rem a sangre: abajo a la izquierda el medallón de 144 px (96 px en móvil) y a su lado el h1 en Cinzel 3.75rem (2.25rem en móvil), la línea categoría · torneo con la cinta de estado y la frase del balance con cifras en Inter 600 crema. Los controles del dueño, visibles y enfocables, arriba a la derecha y en el borde del medallón. El boleto del próximo partido monta 2rem sobre el borde inferior de la portada, a lo ancho del contenedor de 80rem: fecha grande a la izquierda, escudos con el rombo VS al centro, hora y lugar a la derecha. Debajo asoma el título «Plantilla» con su primera fila de cromos. Interacción firma: los cromos se reparten al entrar en pantalla (suben y se enderezan desde un giro leve, ligado al scroll) y al pasar el cursor el cromo se eleva y un brillo de lámina lo cruza. Movimiento con curva cubic-bezier(0.32, 0.72, 0, 1); todo se apaga con prefers-reduced-motion.

FORM: Álbum de cromos, quinto de mi lista ordenada de siete. Semilla 64db7122 (read, degradada: sin retadores ni tableros); repartió 6, 3 y 5 y el usuario fijó la 5. Construcción code-led: no hay generación de imágenes.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Momento memorable

La pared de cromos con los dorsales dorados contorneados y el brillo de lámina al pasar el cursor.

## Decisiones abiertas

- Ninguna.
