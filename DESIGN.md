---
name: Torneos Baloncesto Manta
description: Cartelera nocturna de los torneos de baloncesto de Manta, en marino, oro y crema, con el celeste reservado para actuar.
colors:
  marino: "#081226"
  marino-claro: "#0E1D3D"
  celeste: "#29A9E1"
  oro: "#D6B36A"
  crema: "#F1E7D0"
  carbon: "#16181D"
  white: "#FFFFFF"
  slate-200: "oklch(92.9% 0.013 255.508)"
  slate-300: "oklch(86.9% 0.022 252.894)"
  slate-400: "oklch(70.4% 0.04 256.788)"
  rose-100: "oklch(94.1% 0.03 12.58)"
  rose-300: "oklch(81% 0.117 11.638)"
  rose-500: "oklch(64.5% 0.246 16.439)"
typography:
  display:
    fontFamily: '"Cinzel", ui-serif, Georgia, serif'
    fontSize: "3.75rem"
    fontWeight: 700
    lineHeight: 1.25
  headline:
    fontFamily: '"Cinzel", ui-serif, Georgia, serif'
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: '"Cinzel", ui-serif, Georgia, serif'
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.375
  score:
    fontFamily: '"Cinzel", ui-serif, Georgia, serif'
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: '"tnum"'
  dorsal:
    fontFamily: '"Cinzel", ui-serif, Georgia, serif'
    fontSize: "3.75rem"
    fontWeight: 700
    lineHeight: 1
  plaque:
    fontFamily: '"Cinzel", ui-serif, Georgia, serif'
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1rem"
    letterSpacing: "0.25em"
  ribbon:
    fontFamily: '"Cinzel", ui-serif, Georgia, serif'
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: "1rem"
  body-lead:
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.1em"
  button:
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: "1.25rem"
rounded:
  sm: "0.25rem"
  md: "0.375rem"
  lg: "0.5rem"
  xl: "0.75rem"
  2xl: "1rem"
  full: "9999px"
spacing:
  gutter: "16px"
  gutter-sm: "24px"
  gutter-lg: "32px"
  grid-gap: "24px"
  section: "96px"
  section-compact: "80px"
components:
  button-primary:
    backgroundColor: "{colors.celeste}"
    textColor: "{colors.marino}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.white}"
    textColor: "{colors.marino}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
    padding: "12px 20px"
  button-secondary-hover:
    backgroundColor: "rgb(255 255 255 / 0.1)"
    textColor: "{colors.white}"
  link-action:
    textColor: "{colors.celeste}"
    typography: "{typography.button}"
  link-action-hover:
    textColor: "{colors.white}"
  button-access:
    backgroundColor: "transparent"
    textColor: "{colors.oro}"
    padding: "8px 16px"
  button-access-hover:
    backgroundColor: "{colors.oro}"
    textColor: "{colors.marino}"
  ribbon:
    backgroundColor: "{colors.oro}"
    textColor: "{colors.marino}"
    typography: "{typography.ribbon}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  pill-winner:
    backgroundColor: "{colors.oro}"
    textColor: "{colors.marino}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  chip:
    backgroundColor: "rgb(255 255 255 / 0.05)"
    textColor: "{colors.slate-200}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
  medallion:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.full}"
    size: "128px"
  match-card:
    backgroundColor: "{colors.marino-claro}"
    rounded: "{rounded.xl}"
    padding: "48px 32px 24px"
  tournament-card:
    backgroundColor: "{colors.marino-claro}"
    padding: "48px 64px"
  sponsors-band:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.2xl}"
    padding: "24px 0"
  cta-panel:
    backgroundColor: "{colors.marino-claro}"
    rounded: "{rounded.xl}"
    padding: "56px"
  player-card:
    backgroundColor: "rgb(255 255 255 / 0.04)"
    rounded: "{rounded.2xl}"
    padding: "6px"
  match-ticket:
    backgroundColor: "{colors.marino-claro}"
    rounded: "{rounded.xl}"
  list-panel:
    backgroundColor: "{colors.marino-claro}"
    rounded: "{rounded.xl}"
  select:
    backgroundColor: "{colors.marino}"
    textColor: "{colors.crema}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
    padding: "8px 32px 8px 12px"
  nav:
    backgroundColor: "{colors.marino}"
    textColor: "{colors.slate-300}"
    height: "64px"
  footer:
    backgroundColor: "{colors.carbon}"
    textColor: "{colors.slate-300}"
---

# Sistema de diseño: Torneos Baloncesto Manta

## Overview

**Norte creativo: «La cartelera de noche de partido»**

La cara pública de Torneos Baloncesto Manta se viste como el cartel de una noche de partido. Un marino profundo ocupa toda la página. El oro dibuja el cartel con filetes, esquinas en L, un rombo VS y cintas de fecha. Los titulares van en Cinzel color crema, con las versalitas de una placa de trofeo, y un único color de acción, el celeste del escudo, marca lo que se puede pulsar, lo que avanza y dónde está el foco. Marino y celeste salen del logo oficial; el dorado queda para los logros.

La densidad es baja y el ritmo amplio: secciones con 80 a 96 px de aire vertical, contenedores de 72 a 80 rem y pares de texto y objeto en columnas asimétricas. La profundidad no viene de tarjetas flotando sobre gris, sino de capas tonales (marino, marino claro y una franja negra) y de atmósfera: la foto del coliseo con un zoom lento, el logo desenfocado como marca de agua con parallax y una luz radial tenue dentro de cada cartel de partido. El movimiento es ambiental y lento; en el perfil de equipo, además, los bloques y los cromos entran una sola vez al llegar a pantalla. Todo se apaga con movimiento reducido.

Este sistema rechaza la plantilla genérica: no hay hero centrado, ni tarjetas de beneficios, ni fila de métricas. Vive dentro del contenedor `.tema-cartel` en la portada pública (`/`), el directorio y el perfil de equipos (`/equipos` y `/equipos/:id`), el detalle de torneo (`/torneos/:id`), el perfil de jugador (`/jugadores/:id`), el buscador de jugadores (`/visor`) y el panel del delegado (`/delegado/dashboard`), que muestra el perfil de su equipo. El resto del producto, es decir, las pantallas de administrador, las demás del delegado y la autenticación, sigue en el shell operativo «institucional neutro» del mismo `@theme`. Ese shell se ubica al final de Colors y queda fuera de estas reglas.

**Rasgos clave:**
- Noche marino continua de borde a borde; el blanco solo sostiene marcas ajenas.
- Oro como filete de cartel y como honor: esquinas, rombo, cintas, píldora GANADOR y marcador del ganador.
- Cinzel crema para lo que se anuncia; Inter para lo que se lee y se pulsa.
- Celeste solo para actuar, avanzar y enfocar.
- Cada cinta y cada cifra lleva un dato real; ninguna es un rótulo decorativo.
- Movimiento ambiental y lento, con entradas de una sola vez en el perfil de equipo; todo se apaga con `prefers-reduced-motion`.

## Colors

Una noche marino con dos metales: el oro distingue y el celeste actúa.

### Primario
- **Celeste Escudo** (#29A9E1, `celeste`): el color de acción. Rellena los botones primarios (texto marino encima, 6.98:1) y tiñe los enlaces de acción. Marca el progreso: la barra de 10 s del carrusel, el punto activo y el pulgar de la barra de desplazamiento, mezclado al 45 % con marino. Marca también el foco: el anillo de 2 px, el cursor de texto y `accent-color`. Al pasar el cursor, botones y enlaces celestes pasan a blanco; los nombres que enlazan hacen lo inverso y pasan de su tinta a celeste.

### Secundario
- **Oro Trofeo** (#D6B36A, `oro`): el filete y el honor. Lo usan los bordes de 1 px (entre el 20 % y el 70 %), las esquinas en L (al 40 %), el rombo VS (al 70 %), las cintas de fecha y de estado y la píldora GANADOR (oro sólido con texto marino, 9.35:1). También el marcador del ganador, los dorsales contorneados del cromo, el año de cada edición en el historial, los íconos de apoyo (calendario, contacto, lugar), las barras bajo los títulos del pie y la selección de texto. Los únicos controles en oro son el botón de acceso de la barra, «Ingresar», y el botón que cambia el escudo en el perfil de equipo: contorno oro que se llena de oro al pasar el cursor.

### Terciario
- **Crema Placa** (#F1E7D0, `crema`): la tinta de todo lo que va en Cinzel. Titulares, nombre del torneo, nombres de equipo, apellidos del cromo, el dato de la franja del cartel (hora o ganador), la fecha y la hora del boleto y las cifras destacadas en prosa (15.19:1 sobre marino). En la barra, el nombre del sitio y el enlace activo; en los filtros, el texto de los selectores. El marcador del perdedor baja a crema al 55 %, y el guion del marcador, al 40 %.

### Neutros
- **Marino Noche** (#081226, `marino`): el fondo de toda la página, incluido el `html`, para que el rebote del scroll no muestre otro color. También la barra de navegación en las rutas de este mundo, el fondo de los selectores de los perfiles, el relleno del rombo VS y el texto sobre celeste y sobre oro.
- **Marino Cartel** (#0E1D3D, `marino-claro`): la superficie elevada. Sólida en el panel CTA, en el boleto y en el núcleo del cromo; al 70 % en el cartel de partido, al 80 % en los paneles de lista del perfil de equipo y al 90 % en la tarjeta de torneo sobre la foto.
- **Carbón** (#16181D, `carbon`): solo el pie de página. Es un valor literal en `Footer.tsx`, sin token en `@theme`: un gris frío que cierra la noche y separa el pie del contenido.
- **Blanco** (#FFFFFF, `white`): el soporte de marcas ajenas (medallones de escudos, banda de auspiciantes) y el hover de las acciones celestes. Como tinta, el texto de los botones secundarios y los títulos de columna del pie. Sus veladuras hacen el resto: 4 % para la bandeja del cromo, 5 % para chips y paneles de estado, 10 % para bordes finos, divisores, pistas, hovers y esqueletos, 15 % para el contorno de selectores y botones de página, 20 a 30 % para el contorno del botón de pausa y los puntos inactivos, y 25 % para el contorno de los botones secundarios.
- **Pizarra Clara** (oklch(92.9% 0.013 255.508), `slate-200`): texto de chips e ícono de pausa; final del degradado de los medallones.
- **Pizarra Texto** (oklch(86.9% 0.022 252.894), `slate-300`): párrafos sobre marino, enlaces de navegación en reposo y texto base del pie.
- **Pizarra Tenue** (oklch(70.4% 0.04 256.788), `slate-400`): texto secundario. El segundo párrafo, la línea de metadatos del cartel, el subtítulo de sección, los avisos y la línea legal del pie.

El botón flotante de WhatsApp usa el verde de la marca del servicio (#25D366) con el ícono blanco. Es una marca ajena, no un color del sistema.

### Aviso
- **Rosa Aviso** (`rose-500`, con `rose-100` y `rose-300`): lo destructivo y lo negativo, allí donde el dueño de un equipo edita su perfil. Tiñe los controles que quitan la portada o el escudo, el que desactiva el equipo y el chip de una inscripción rechazada o de un equipo retirado. Siempre es veladura: fondo `rose-500` al 10 % en reposo y del 20 al 30 % al pasar el cursor, tinta `rose-100` y contorno `rose-300` al 40 %. Nunca es un relleno sólido.

### Reglas
**La regla del celeste útil.** El celeste, como tinta o como relleno, solo marca acción, progreso o foco. Su única otra aparición es la luz del cartel de partido y del boleto, un radial al 18 % a la izquierda (el lado local en el cartel y el propio en el boleto), que se lee como foco de estadio y no como color. Si algo celeste no se pulsa, no avanza y no señala el foco, sobra.

**La regla del filete dorado.** El oro dibuja y distingue; no llena. Trazos finos, esquinas, cintas, píldoras y el marcador del ganador. Ningún panel ni sección es oro.

**La regla del blanco prestado.** Una superficie blanca solo existe para que se lea una marca ajena: el escudo de un equipo o el logo de un auspiciante. La noche nunca se corta con secciones blancas.

### Shell operativo (otro sistema)
El mismo `@theme` declara la paleta «institucional neutra» del shell: la escala `primary-50` a `primary-900`, `accent-500` y `accent-600`, `success-500`, `danger-500` y `warning-500`, sobre los grises de Tailwind y el fondo claro del `body`. Rige todas las rutas fuera de este mundo: el panel de administrador (`/admin/*`), el resto del área de delegado (`/delegado/*`, salvo su panel) y la autenticación (`/auth/*`). También el `Navbar` fuera de las rutas de este mundo y el `Sidebar`. Este documento no la redefine: los colores de este mundo no entran en esas pantallas, y la escala `primary-*` no entra en este mundo.

## Typography

**Fuente display:** Cinzel 600 y 700 (Google Fonts), con respaldo `ui-serif, Georgia, serif` (token `--font-display`).
**Fuente de texto:** Inter 400, 500, 600 y 700 (Google Fonts), con respaldo `ui-sans-serif, system-ui, sans-serif` (token `--font-sans`).

**Carácter:** Cinzel es una romana lapidaria sin minúsculas. Lo que se escribe en minúscula sale en versalitas, así que un titular en caja normal se lee como una placa de trofeo grabada. Inter hace todo el trabajo de lectura e interfaz y deja que la display sea la única voz ceremonial.

### Jerarquía
- **Display** (Cinzel 700; 2.25rem en móvil y 3.75rem desde 640 px; interlineado 1.25; líneas equilibradas): el h1 de la portada. El título de la sección de partidos usa el mismo tamaño en caja alta, con tracking de 0.025em e interlineado ajustado. El nombre del equipo en su perfil sube por pasos (2.25rem, 3rem desde 640 px y 3.75rem desde 1024 px), con interlineado de 1.05.
- **Titular** (Cinzel 700; 1.875rem en móvil y de 2.25 a 3rem desde 640 px; interlineado 1.25): los h2 de sección y el nombre del torneo en la tarjeta diagonal. El de auspiciantes se queda en 1.875rem porque vive en la columna estrecha.
- **Título** (Cinzel 700; 1rem, y 1.125rem desde 640 px; interlineado 1.375; dos líneas como máximo): los nombres de equipo del cartel.
- **Marcador** (Cinzel 700; 1.75rem, 2.25rem desde 640 px y 3rem desde 1024 px; interlineado 1; cifras tabulares): el tanteo de un resultado. En el perfil de equipo, la misma voz da el día del boleto (2.25rem, 3rem desde 768 px), su hora (1.875rem), el tanteo de cada fila de resultados (1.5rem) y el año de cada edición, este en oro.
- **Dorsal** (Cinzel 700; 3rem, y 3.75rem desde 640 px; interlineado 1; sin relleno y con un contorno oro de 1.5 px): el número de camiseta del cromo. Es la única cifra contorneada del sistema.
- **Placa** (Cinzel 600; 0.75rem; caja alta con tracking de 0.25em; oro al 80 %): los rótulos de la franja del cartel, «PRÓXIMO PARTIDO» y «GANADOR», y los del boleto (día de la semana, mes y «PRÓXIMO PARTIDO»). En el cartel los sigue el dato en crema, de 1 a 1.125rem y con tracking normal. El subtítulo de sección usa esta voz a 0.875rem, con 0.15em y en `slate-400`.
- **Cinta** (Cinzel 700; 0.75rem; caja alta): las cintas de fecha y de estado. La píldora GANADOR y las píldoras de resultado bajan a 10 px con tracking de 0.1em.
- **Entradilla** (Inter 400; 1.125rem; interlineado 1.625): el primer párrafo de una sección.
- **Cuerpo** (Inter 400; 1rem; interlineado 1.625; medida máxima de unos 36rem): párrafos. El segundo párrafo baja a `slate-400`.
- **Etiqueta** (Inter 600; 11 px; caja alta; tracking de 0.1em; `slate-400`): la línea de metadatos del cartel (fase · categoría · lugar).
- **Botón** (Inter 600; 0.875rem): botones y enlaces de acción. La navegación usa Inter 500 al mismo tamaño. Los títulos de columna del pie van en Inter 700 a 0.875rem, en caja alta y con tracking de 0.2em.

### Reglas
**La regla de la placa.** Cinzel anuncia; Inter informa y opera. Titulares, torneos, equipos, marcadores, cintas y placas van en Cinzel. Párrafos, botones, enlaces, navegación, metadatos y títulos del pie van en Inter. Un botón nunca va en Cinzel. Los titulares se escriben en caja normal para que Cinzel los componga en versalitas; la caja alta completa queda para rótulos cortos.

**La regla de las cifras.** Toda cifra que se compara o se consulta (marcadores, horas, fechas, teléfonos y conteos) usa cifras tabulares. Las cifras de conjunto se dicen en una frase, con el número en Inter 600 crema, nunca en una fila de métricas.

## Layout

La página es una sola columna de secciones apiladas sobre una noche fija. Cada sección centra un contenedor: 80rem para el hero y los auspiciantes; 72rem para Conócenos, Partidos, el CTA y el pie. Los márgenes laterales son de 16 px en móvil, 24 px desde 640 px y 32 px desde 1024 px. El ritmo vertical es de 96 px por sección, 80 px en el hero y en la banda de auspiciantes, y 64 px en el pie. Las anclas de sección compensan los 64 px de la barra fija.

Desde 1024 px, los pares de texto y objeto se abren en columnas asimétricas. El hero reparte 1 : 1.3, con el titular a la izquierda y la tarjeta de torneo a la derecha. Los auspiciantes reparten 3 : 7, con columnas de mínimo cero para que la marquesina no estire la suya, y el CTA reparte 1.5 : 1. Conócenos reparte 1 : 1. Los carteles de partido forman una rejilla de dos columnas desde 768 px, con 24 px de separación. El pie pasa de una columna a dos (desde 640 px) y a cuatro (desde 1024 px), con 48 px entre ellas. Por debajo de esos cortes todo se apila en una columna, y la tarjeta de torneo queda bajo el titular.

El hero ocupa la primera pantalla menos la barra (100svh − 4rem). En profundidad, la marca de agua fija va debajo de todo y las secciones encima. El botón flotante de WhatsApp flota sobre el contenido, y la barra, por encima de todo.

El perfil de equipo usa el contenedor de 80rem. Abre con una portada a sangre de 24rem de alto mínimo (28rem desde 640 px): el medallón y el nombre se asientan abajo a la izquierda, y los controles del dueño, arriba a la derecha. El boleto del próximo partido monta 2rem sobre el filete inferior de la portada, a lo ancho del contenedor. Sigue la plantilla, con el álbum de cromos en una rejilla de 2, 3, 4 y 6 columnas (desde 640, 1024 y 1280 px) y 16 px de separación (20 px desde 640 px). Al final, Resultados e Historial se reparten 7 : 5 desde 1280 px, con 40 px entre ellos, y por debajo se apilan con 64 px. Entre bloques hay 80 px de aire (96 px desde 640 px).

### Reglas
**La regla de la noche continua.** Ninguna sección pinta un fondo propio: todas se apilan transparentes sobre el marino de la página, así la marca de agua y la luz corren sin cortes. La foto del hero se funde hacia abajo con una máscara de 10rem; la portada del perfil de equipo se cierra con un filete oro al 30 %, y solo el pie cambia de superficie.

## Elevation & Depth

El sistema es híbrido: capas tonales, sombras negras suaves y atmósfera. La superficie base es el marino; los paneles suben a marino claro; la franja inferior del cartel se hunde con negro al 35 %, y el pie cambia a carbón. El cromo suma un doble bisel: una bandeja con veladura blanca al 4 % y, dentro, un núcleo marino claro con un filo de luz blanco al 8 % en su borde superior (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08)`). Las piezas elevadas proyectan sombras negras difusas con desplazamiento vertical. Detrás de todo está la atmósfera. La foto del coliseo va desenfocada 3 px bajo un velo marino horizontal (100 %, 80 % y 35 %). El logo `logo-recortado.webp` queda fijo, a 80vh de alto, desenfocado 10 px y con opacidad 0.26.

### Vocabulario de sombras
- **Panel** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)`): el cartel de partido, el panel CTA, el boleto y los paneles de lista del perfil de equipo.
- **Banda** (`box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.3)`): la banda blanca de auspiciantes.
- **Medallón** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)`): los medallones de escudo, con un anillo oro al 40 % de 2 px, y el botón flotante.
- **Escudo** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)`): el medallón compacto de las listas de partidos, del boleto y del perfil de equipo, con el mismo anillo oro.
- **Cromo** (`box-shadow: 0 24px 48px -24px rgb(0 0 0 / 0.7)`; al pasar el cursor, `0 32px 56px -24px rgb(0 0 0 / 0.85)`): la sombra recogida bajo cada cromo. El spread negativo de 24 px la concentra bajo la base; por eso admite más opacidad.
- **Sombra del balón**: una elipse negra al 70 %, desenfocada 12 px, bajo el balón 3D. Se estrecha a la mitad y se aclara (de 0.55 a 0.15) cuando el balón sube.

### Reglas
**La regla de la sombra negra.** Toda sombra es negra, difusa y desplazada hacia abajo, al 30–40 % (la del cromo llega al 70 %, recogida bajo su base); nunca de color, nunca dura. La luz de color vive dentro del cartel de partido y del boleto como radiales tenues (celeste al 18 %, oro al 14 %), y dentro del cromo como el brillo de lámina que lo cruza al pasar el cursor; nunca como halo alrededor de un objeto.

**La regla del desenfoque de fondo.** El desenfoque solo aleja fondos: la foto (3 px), la marca de agua (10 px) y la sombra del balón (12 px). Ningún panel usa cristal ni `backdrop-filter`.

## Shapes

El lenguaje de formas mezcla dos familias. Contenedores y controles tienen esquinas suaves y escalonadas: 0.25rem en las cintas, 0.375rem en los chips, 0.5rem en botones y selectores, 0.75rem en carteles, boletos y paneles (incluidos los de estado) y 1rem en la banda de auspiciantes y en la bandeja del cromo, cuyo núcleo baja a 0.625rem para que las dos curvas sean concéntricas. Medallones, píldoras, puntos del carrusel, botón de pausa, botones del escudo, anillos de íconos del pie y botón flotante son círculos. Las piezas de cartel son geométricas y afiladas:

- **Paralelogramo:** la tarjeta de torneo se recorta con `clip-path: polygon(6% 0, 100% 0, 94% 100%, 0 100%)`. Su filete oro (al 55 %) es un contenedor con el mismo recorte y 1 px de relleno, porque un borde no sigue al `clip-path`.
- **Rombo VS:** un cuadrado de 56 px (64 px desde 640 px) girado 45°, con borde oro al 70 %, relleno marino y el texto contragirado. En el boleto va compacto: 44 px (48 px desde 640 px).
- **Esquinas en L:** cuatro ángulos de 16 × 16 px en trazo oro de 1 px al 40 %, a 12 px de cada esquina (`Esquinas`), en el cartel de partido, en el panel CTA y en el boleto (desde 768 px).
- **Filetes y barras:** bordes de 1 px en oro, al 25 % en el cartel y en el boleto (el del cartel sube al 60 % al pasar el cursor), al 30 % en el CTA y bajo la portada del perfil, y al 40 % en el cromo (70 % al pasar el cursor). Una línea oro al 20 % separa la franja inferior del cartel. En el pie, una barra oro de 32 × 2 px va bajo cada título y una línea de 1 px al 50 %, bajo el logo.
- **Perforación:** una línea discontinua oro al 30 % separa el talón del boleto: vertical desde 768 px, horizontal por debajo.

### Reglas
**La regla del cartel afilado.** Paralelogramo, rombo y esquinas en L tienen ángulos vivos. El redondeo es de contenedores y controles; el círculo, de medallones, píldoras y puntos.

## Components

### Botones
Sobrios y claros: la acción la dice el color, no la forma.
- **Forma:** esquinas suaves (0.5rem).
- **Primario:** relleno celeste con texto marino, Inter 600 a 0.875rem y relleno de 12 × 20 px (14 × 24 px en el CTA). Al pasar el cursor, el fondo pasa a blanco con una transición de color de 150 ms.
- **Secundario:** contorno blanco de 1 px al 25 % y texto blanco; al pasar el cursor, una veladura blanca al 10 %. «Reintentar» usa este estilo en tamaño compacto (8 × 16 px). Sobre una foto lleva un respaldo marino al 70 % y relleno de 8 × 14 px: así van los controles del dueño en la portada del perfil («Cambiar portada»).
- **Enlace de acción:** texto celeste en Inter 600, con flecha de 16 px; blanco al pasar el cursor («Ver torneo», «Regístrate»).
- **Nombre que enlaza:** rivales y equipos conservan su voz y su tinta (Cinzel crema) y pasan a celeste al pasar el cursor, sin subrayado.
- **Foco:** anillo celeste de 2 px, separado 3 px, en todas las páginas de este mundo (`html:has(.tema-cartel)`), navbar incluido.
- **Acceso:** «Ingresar», en la barra. Contorno oro al 70 %, texto oro e Inter 500; al pasar el cursor se llena de oro con texto marino. Conserva el radio de 0.75rem del `Navbar` compartido.
- **Escudo:** en el perfil de equipo, el dueño cambia el escudo con un botón circular de 36 px montado en el borde del medallón: fondo marino, ícono oro y anillo oro al 60 % de 2 px; al pasar el cursor se llena de oro con el ícono marino. A su lado, «Quitar escudo» lleva un anillo blanco al 25 % y el ícono en `slate-300`.
- **Destructivo:** «Desactivar» es un secundario con contorno `rose-300` al 40 % y tinta `rose-100`. «Quitar portada» y «Quitar escudo» son neutros y solo se tiñen de rosa al pasar el cursor: veladura `rose-500` del 20 al 30 % y tinta `rose-100`.
- **Paginación:** botones cuadrados de 36 px con contorno blanco al 15 %, radio de 0.5rem y flecha crema; al pasar el cursor, contorno oro al 50 % y veladura blanca al 5 %; deshabilitados, al 40 %. Entre ellos, la página en cifras tabulares y `slate-300` («1 / 3»).

### Chips
- **Categoría:** veladura blanca al 5 %, borde blanco al 10 %, texto `slate-200` en Inter a 0.75rem, radio de 0.375rem y relleno de 4 × 10 px. Informan; no filtran.
- **Estado de inscripción:** en el panel del delegado, el mismo chip, en Inter 600, dice bajo el nombre del equipo en qué estado está su inscripción. Si fue rechazada o el equipo se retiró, se tiñe de rosa aviso.

### Cintas y píldora
- **Cinta dorada:** oro sólido, texto marino en la voz de cinta, radio de 0.25rem y relleno de 2 × 8 px. Siempre lleva un dato. En el cartel es la fecha del partido, centrada sobre el borde superior a 12 px. En la tarjeta diagonal es el estado del torneo («En curso», «Próximamente» o «Finalizado») y la encabeza. En el perfil de equipo abre cada línea de torneo en curso o próximo, seguida de sus categorías en crema y del nombre del torneo.
- **Píldora GANADOR:** oro sólido con texto marino, Cinzel 700 a 10 px con tracking de 0.1em, ícono de trofeo de 12 px y forma de píldora. Solo va sobre el nombre del ganador de un partido finalizado. El lado perdedor reserva su alto de forma invisible para que los nombres queden alineados.
- **Píldora de resultado:** en la lista de resultados del perfil, «Victoria» es la píldora GANADOR sin ícono; «Derrota» y «Empate» van en veladura blanca al 10 % con texto `slate-300`.

### Cartel de partido (componente firma)
`TarjetaPartido` lleva el cartel de pelea «A vs B» al baloncesto. Todo el cartel es un enlace al torneo.
- **Contenedor:** marino claro al 70 %, borde oro al 25 % (60 % al pasar el cursor), radio de 0.75rem y sombra de panel.
- **Campo:** luz radial celeste al 18 % a la izquierda y oro al 14 % a la derecha, a la altura de los escudos; esquinas en L; la cinta de fecha arriba, al centro. Relleno de 48 px arriba, 24 px abajo y 16 px a los lados (32 px desde 640 px).
- **Eje:** tres columnas (escudo, centro, escudo), con las laterales capaces de encogerse hasta cero. Debajo van los nombres, en la voz de título.
- **Medallón** (`Medallon`): círculo blanco con degradado vertical a `slate-200`, relleno interior del 14 %, anillo oro al 40 % de 2 px y sombra de medallón. Mide hasta 88 px en móvil y 128 px desde 640 px. El escudo se ajusta sin recorte; si no hay escudo, se muestra un ícono de escudo en `slate-400`. La variante compacta (`Escudo`: logo al 76 % y sombra de escudo) va en las listas de partidos, en el boleto y en el perfil de equipo, de 36 a 144 px.
- **Próximo partido:** el rombo VS en el centro. La franja inferior dice «PRÓXIMO PARTIDO» con la hora en crema y, debajo, fase · categoría · lugar.
- **Resultado:** el marcador grande en el centro: el ganador en oro, el perdedor en crema al 55 % y el guion al 40 %, con la píldora GANADOR sobre el ganador. La franja inferior dice «GANADOR» con su nombre y, debajo, la fase (o «Victoria por W.O.») y la categoría. Con marcadores iguales gana el local, igual que en la tabla de posiciones.
- **Franja inferior:** negro al 35 % sobre el cartel, línea superior oro al 20 %, texto centrado y relleno de 16 px.

### Tarjeta diagonal de torneo (componente firma)
`HeroTorneos` muestra hasta ocho torneos en un paralelogramo con filete oro, relleno marino claro al 90 % sobre la foto, relleno interior de 40 × 48 px (48 × 64 px desde 640 px) y alto mínimo de 22rem. Cada diapositiva (`SlideTorneo`) apila:
- la cinta de estado;
- el nombre del torneo, en la voz de titular;
- el rango de fechas, con un calendario oro y cifras tabulares;
- los chips de categoría;
- el enlace «Ver torneo».

Debajo van los controles:
- **Pausa:** botón circular de 32 px con borde blanco al 20 %.
- **Puntos:** de 8 px; el activo se estira a 32 px en celeste, y los demás van en blanco al 30 % (al 60 % al pasar el cursor), cada uno con 24 px de alto táctil.
- **Progreso:** barra de 2 px, celeste sobre blanco al 10 %, que tarda 10 s y al terminar pasa al torneo siguiente.

La pausa congela la barra, y solo en pausa se anuncia el cambio a los lectores de pantalla.

### Banda de auspiciantes
Desde 1024 px, el texto ocupa el 30 % y la banda el 70 %. La banda es un panel blanco con radio de 1rem, sombra de banda y 24 px de relleno vertical. Lleva una marquesina infinita de logos de 144 × 80 px, ajustados sin recorte y con 32 px a cada lado. Una máscara la desvanece en los bordes: transparente, negro del 8 % al 92 % y otra vez transparente. Recorre la lista en 45 s y se detiene al pasar el cursor. Solo la primera vuelta se anuncia a los lectores de pantalla. Sin auspiciantes, muestra un aviso breve en `slate-400`.

### Panel CTA
Es el mismo cartel que el del partido, en sólido: marino claro, borde oro al 30 %, radio de 0.75rem, esquinas en L, sombra de panel y relleno de 40 px (56 px desde 640 px). El titular y el cuerpo van a la izquierda. A la derecha, el botón primario y el secundario van apilados a ancho completo, con la invitación a registrarse debajo en `slate-400` y el enlace en celeste.

### Cromo (componente firma)
`Cromo` vuelve álbum la plantilla del perfil de equipo. Cada cromo es un enlace a la ficha del jugador.
- **Doble bisel:** una bandeja con veladura blanca al 4 %, filete oro de 1 px al 40 %, radio de 1rem, relleno de 6 px y sombra de cromo. Dentro, el núcleo marino claro, con radio de 0.625rem y el filo de luz.
- **Retrato:** 3:4, recortado al rostro (encuadre al 20 % desde arriba). Un degradado marino sube desde la base hasta la mitad. Sin foto, las iniciales van en Cinzel 700 a 3rem, en oro al 30 %.
- **Dorsal:** en la voz de dorsal, abajo a la izquierda, sobre el degradado.
- **Nombre:** bajo el retrato, los apellidos en Cinzel 700 a 0.95rem crema (blancos al pasar el cursor) y, debajo, los nombres en Inter a 0.75rem `slate-400`, con mayúscula inicial. El nombre solo se parte cuando el orden de nombres y apellidos es claro; si no, va completo.
- **Al pasar el cursor:** sube 6 px en 500 ms, su sombra se hunde, el filete pasa al 70 %, el retrato crece a 1.04 en 700 ms y un brillo de lámina (una banda crema al 30 %, inclinada −16°) lo cruza en 1 s, todo con la curva del álbum, `cubic-bezier(0.32, 0.72, 0, 1)`. Con movimiento reducido solo cambian el filete y el nombre.

### Boleto del próximo partido (componente firma)
`Boleto` da el próximo partido como una entrada. Es un cartel sólido: marino claro, borde oro al 25 %, radio de 0.75rem, sombra de panel y esquinas en L desde 768 px. Monta 2rem sobre el filete de la portada. Desde 768 px se reparte en tres columnas (talón, campo y hora); por debajo se apila.
- **Talón:** el día en la voz de marcador, en crema, entre el día de la semana y el mes en la voz de placa. La perforación lo separa del campo.
- **Campo:** la luz de estadio del cartel, los dos escudos (48 px, 56 px desde 640 px) con el rombo VS compacto entre ellos y «vs» seguido del rival, en Cinzel 700 crema (1.25rem, 1.5rem desde 640 px). El rival enlaza a su equipo. Debajo, fase · categoría en `slate-400`.
- **Hora:** «PRÓXIMO PARTIDO» en la voz de placa, la hora en la de marcador, el lugar con un pin oro al 80 % y el enlace de acción «Ver torneo». Desde 768 px se alinea a la derecha; una línea blanca al 10 % la separa del campo.
- **Sin partido:** un panel de lista con «Sin partidos programados» y una línea en `slate-400`.

### Panel de lista
Resultados, próximas fechas e historial van en un panel de cartel: marino claro al 80 %, borde oro al 25 %, radio de 0.75rem y sombra de panel. Las filas se dividen con líneas blancas al 10 % y llevan 20 px de relleno lateral (24 px desde 640 px).
- **Resultado:** la píldora de resultado, el escudo de 36 px, «vs» y el rival en Cinzel crema, con la fecha y la fase debajo (Inter a 0.75rem, `slate-400`), y el tanteo con la cifra propia primero: la del ganador en oro y la otra en crema al 55 %.
- **Próxima fecha:** escudo, rival y fecha, con la hora a la derecha en Cinzel, crema al 80 %.
- **Edición:** el año en oro, el torneo en Cinzel crema, la categoría en `slate-400` y «Ver torneo», que en móvil se reduce a la flecha con 44 px de alto táctil.
- **Vacío:** un título en Inter 600 crema y una línea en `slate-400`, centrados en el mismo panel.

### Selectores
Los filtros son `<select>` nativos: contorno blanco al 15 %, radio de 0.5rem, texto crema en Inter 600 a 0.875rem y contorno oro al 50 % al pasar el cursor. El fondo es marino en los perfiles y marino claro en el directorio y el buscador. El foco es el anillo celeste, y `color-scheme: dark` oscurece la lista desplegable. En el perfil de equipo filtran la plantilla por torneo y categoría, con 14rem de ancho desde 640 px.

### Navegación
- **En este mundo** (`/`, `/equipos` y los perfiles de equipo, `/torneos/:id`, `/jugadores/:id`, `/visor` y `/delegado/dashboard`): barra fija de 64 px, marino, con una línea inferior blanca al 10 %. A la izquierda, el escudo recortado de 48 px y el nombre del sitio en Inter 700 a 1.25rem crema (oculto en móvil). Los enlaces van en Inter 500 a 0.875rem: `slate-300` en reposo, blancos al pasar el cursor y crema cuando están activos. A la derecha, el botón de acceso oro. Con sesión iniciada aparece un chip de usuario con veladura blanca al 5 % y la inicial en marino sobre un círculo oro.
- **Fuera de esas rutas:** la misma barra vuelve al shell (blanca, con `primary-600`). El cajón móvil (`Sidebar`) aún no tiene variante oscura.

### Pie de página
Fondo carbón, texto `slate-300` a 0.875rem, contenedor de 72rem y 64 px de relleno vertical. Cuatro columnas: marca (logo de 96 px de alto, línea oro y un párrafo), Torneos (hasta seis, del API), Navegación y Contacto. Cada título de columna lleva debajo una barra oro de 32 × 2 px. Los íconos de contacto van en anillos de 28 px con borde oro al 40 %. Los enlaces pasan a blanco al pasar el cursor. Una línea blanca al 10 % separa la franja legal, en `slate-400` a 0.75rem.

### Botón flotante de WhatsApp
Círculo de 56 px fijo a 24 px de la esquina inferior derecha, en verde WhatsApp con el logo oficial blanco de 28 px (Simple Icons) y sombra de medallón. Crece a 1.05 al pasar el cursor. Vive en MainLayout: es el único contacto en todo el sitio (se oculta para super_admin) y ningún número se imprime en pantalla. Es la marca del servicio: su verde no se extiende a otros controles.

### Redes sociales del footer
Columna "Síguenos": Instagram y Facebook como círculos de 44 px con borde oro al 40 % y logo oficial en oro; al pasar el cursor se rellenan de oro con el logo en marino. Debajo, la dirección del coliseo.

### Atmósfera: fondo y hero
- **Marca de agua** (`.fondo-logo`): el logo recortado, fijo detrás de todo, a 80vh de alto, desenfocado 10 px y con opacidad 0.26, en la portada, los perfiles de equipo y de jugador, el detalle de torneo y el buscador. Si el navegador admite animaciones ligadas al scroll, se desplaza de +12vh a −12vh a lo largo de la página (parallax); si no, queda fijo.
- **Foto del hero:** `hero-coliseo.jpg` a sangre y desenfocada 3 px. Tiene un zoom lento infinito (`.hero-zoom`: de 1.05 a 1.18 en 28 s, ida y vuelta, `ease-in-out`). Va bajo un velo marino horizontal que pasa del 100 % al 35 %. Una máscara la funde con la página en sus últimos 10rem.
- **Portada del perfil de equipo:** la foto del equipo a sangre, sin zoom ni desenfoque, encuadrada al 30 % desde arriba. Si el equipo no tiene foto, cae a la del coliseo, con el mismo zoom y el desenfoque de 3 px. Dos velos marino la oscurecen: uno horizontal (95 %, 60 % y 30 %) y otro que sube desde la base.
- **Balón 3D** (`balon.glb` en `<model-viewer>`): gira a 35° por segundo y rebota cada 1.6 s, desacelerando al subir y acelerando al caer, mientras su sombra se comprime.
- **Entradas:** la diapositiva del torneo, la identidad del equipo en su portada y la ficha del buscador entran con `.aparecer` (0.7 s, `ease-out`, desde 14 px más abajo y con opacidad 0). En el perfil de equipo, además, el boleto, los bloques de Resultados e Historial y cada cromo entran una sola vez, cuando asoma el 15 % en pantalla. Los bloques suben 1.75rem en 0.8 s. Los cromos se reparten: suben 2.5rem, crecen desde 0.94 y se enderezan desde un giro leve (−3°; 2.5° los pares y −1.5° cada tercero) en 0.9 s. Ambos usan la curva del álbum, y lo que entra a la vez se escalona cada 70 ms. Fuera del perfil de equipo, ninguna sección anima su entrada.

**La regla de la entrada única.** Una entrada ocurre una vez y nunca esconde contenido: el marcado nace visible y solo se oculta mientras espera su turno. Sin JavaScript, sin `IntersectionObserver` o con movimiento reducido, todo está a la vista desde el principio.

### Superficies del navegador
En todas las páginas de este mundo (`html:has(.tema-cartel)`), el lienzo es marino y `color-scheme: dark` oscurece selectores, barras y controles nativos. La barra de desplazamiento lleva el pulgar celeste, mezclado al 45 % con marino, sobre un carril marino. La selección de texto es oro con texto marino. El cursor de texto y `accent-color` son celestes. El foco es un anillo celeste de 2 px con 3 px de separación. Los enlaces subrayados separan el subrayado 4 px.

### Movimiento reducido
Con `prefers-reduced-motion: reduce` se apagan el parallax, el zoom del hero y de la portada del perfil, las entradas (`.aparecer` y las del perfil de equipo, que dejan todo visible), el rebote del balón y de su sombra, la marquesina, el pulso de los esqueletos y, en el cromo, la elevación, el zoom del retrato y el brillo de lámina. El carrusel de torneos arranca en pausa (el botón permite reanudarlo) y el balón no gira.

## Do's and Don'ts

### Hacer
- **Haz** que la página entera sea noche marino (#081226), incluido el `html`, con las secciones transparentes encima.
- **Haz** del celeste (#29A9E1) la única tinta de acción, progreso y foco, con texto marino encima.
- **Haz** los titulares en Cinzel 700 crema (#F1E7D0) y en caja normal; párrafos, botones y navegación, en Inter.
- **Haz** que cada cinta dorada lleve un dato real (fecha o estado) y que marcadores, horas y fechas usen cifras tabulares.
- **Haz** que los escudos y logos ajenos se apoyen en blanco: medallón circular con anillo oro para los escudos, banda blanca para los auspiciantes.
- **Haz** los estados completos sobre la noche: esqueletos y paneles de estado en veladura blanca del 5 al 10 % (o, en el perfil de equipo, el panel de lista), el error con «Reintentar» en botón secundario y el vacío con un aviso en `slate-300` o, dentro de un panel, un título crema con su línea en `slate-400`.
- **Haz** que toda superficie nueva de este mundo tematice la selección, el cursor de texto, la barra de desplazamiento y el foco con la paleta.
- **Haz** que cada animación nueva se apague con `prefers-reduced-motion` y que ninguna entrada esconda contenido si no llega a correr.

### No hacer
- **No** pintes secciones con fondo propio ni cortes la noche con franjas blancas.
- **No** uses celeste como decoración (bordes, íconos, títulos) fuera de la luz radial del cartel de partido y del boleto.
- **No** llenes superficies grandes de oro.
- **No** pongas un rótulo o una cinta encima de un titular a modo de antetítulo; la cinta de estado es un dato del torneo, no la etiqueta de una sección.
- **No** conviertas las cifras de conjunto en una fila de métricas.
- **No** uses sombras de color, sombras duras ni paneles de cristal.
- **No** redondees las piezas de cartel (paralelogramo, rombo, esquinas en L).
- **No** uses glifos ni emoji como íconos; los íconos son de lucide, de trazo uniforme.
- **No** mezcles este mundo con el shell: nada de `primary-*` en sus páginas ni de marino u oro en las pantallas operativas.
