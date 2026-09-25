---
version: 1
slug: "frontend-src-pages-public-home-tsx"
primary_target: "frontend/src/pages/public/Home.tsx"
related_targets: ["frontend/src/features/landing/HeroTorneos.tsx","frontend/src/features/landing/SeccionConocenos.tsx","frontend/src/features/landing/SeccionPartidos.tsx","frontend/src/components/Footer.tsx","frontend/src/components/SponsorsCarousel.tsx"]
---

## Alcance

Portada pública `/` (modo Persuade). Orden fijado por el usuario: Navbar, Hero, Auspiciantes, Conócenos, Próximos partidos, CTA, Footer.

## Visitante y acción

- Aficionados y familias: ver el próximo partido o el último resultado y entrar al torneo.
- Secundario: delegados (CTA a login para inscribir equipo) y auspiciantes (sección y CTA "Ver auspiciantes").
- Prueba: solo datos reales del API (torneos, partidos, equipos, auspiciantes); contacto real +593 98 962 9870 con WhatsApp. Sin redes sociales ni correo.

## Direction contract

THESIS: La portada es la cartelera de una noche de partido en el Coliseo Pablo Delgado Álava: el cartel de pelea "A vs B" trasladado al baloncesto de Manta con marcadores y escudos reales. Rechaza la landing genérica de hero centrado + tarjetas de beneficios + fila de métricas.

OWN-WORLD: Noche marino (#081226 / #0E1D3D) que ocupa toda la página; oro (#D6B36A) como filete de cartel: esquinas en L, rombo VS, cinta de fecha; crema (#F1E7D0) para titulares en Cinzel, versales de placa de trofeo; celeste (#29A9E1) solo para la acción primaria, el progreso y el foco. Medallones blancos para los escudos, tarjeta de torneo en paralelogramo y el logo desenfocado como marca de agua con parallax.

STORY: En un vistazo el visitante sabe que este es el torneo de baloncesto de Manta y qué torneo se está jugando. Baja y ve quién juega el próximo partido y quién ganó el último, y cree porque todo son equipos y marcadores reales. Luego va al partido o al torneo; el delegado, al login para inscribir a su equipo.

FIRST VIEWPORT: La foto del coliseo va a sangre con un zoom lento infinito y un blur sutil, bajo un velo marino. Columna izquierda (~43%): h1 "Torneos Baloncesto Manta" en Cinzel crema, la línea de organizador y "desde 2019", y la acción primaria "Ver partidos" (celeste) con "Conócenos" como secundaria. Columna derecha (~57%): la tarjeta diagonal grande del torneo (estado, nombre, fechas, categorías, "Ver torneo"), que rota cada 10 s con barra de progreso, puntos y pausa. En móvil la tarjeta queda bajo el titular. Interacción firma: la barra de progreso de 10 s que empuja el carrusel y se detiene con pausa. Gramática de movimiento: ambiental y lenta (zoom del hero, parallax atado al scroll), una sola entrada por diapositiva y el rebote del balón 3D con sombra que se comprime. Todo se apaga con prefers-reduced-motion.

FORM: Cartelera de pelea (fight card) aplicada al baloncesto. La fija el brief del usuario con sus referencias: tarjeta VS de boxeo, grilla COMBATES y footer GL PRO. No sale de la lista ordenada. Semilla 8e4d9d40 (persuade, degradada: sin retadores ni tableros); la asignación cede ante el brief. Construcción code-led: no hay generación de imágenes.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Momento memorable

La tarjeta VS con dos escudos en medallones blancos, el rombo dorado y "★ GANADOR" sobre el equipo que ganó.

## Decisiones abiertas

- Horario de atención: no existe; no se muestra.
