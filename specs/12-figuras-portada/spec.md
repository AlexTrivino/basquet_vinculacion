# Fase 12 · Portada: figuras del torneo

## Problema

La portada muestra torneos, auspiciantes, partidos y resultados, pero no a los jugadores. Las figuras de cada categoría ya se calculan para los flyers del admin (la mayor valoración acumulada: puntos + rebotes + asistencias + tapones), pero esa ruta es solo del super_admin.

## Qué entrega

- `GET /api/estadisticas/figuras`, pública: por cada torneo en curso, la figura acumulada de cada categoría hasta hoy, con el mismo cálculo de los flyers. Solo datos públicos: el torneo, la categoría, el jugador (id, nombre, foto y dorsal), su equipo (id, nombre y escudo), los partidos jugados, sus totales, el promedio de puntos y la valoración.
- Una sección nueva en la portada, después de Partidos: «Figuras del torneo», un carrusel 3D con la tarjeta del centro más grande y las vecinas más chicas en perspectiva, flechas, puntos y una barra de progreso. Cambia de figura cada 5 s.
- La tarjeta sigue al cromo del perfil de equipo: doble bisel, retrato 3:4 (o la silueta), dorsal contorneado en oro, la categoría en una cinta dorada, el nombre en Cinzel crema, el escudo y el equipo, los totales en una frase y la valoración en la franja inferior. Al tocar la del centro se abre el perfil del jugador; al tocar una vecina, pasa a ella.
- Colores de la portada: título en Cinzel crema con «del torneo» en oro, celeste solo para el progreso, el punto activo y el foco.
- Se pausa con el botón, al pasar el cursor o al enfocar algo dentro; con movimiento reducido arranca en pausa y sin animar el giro. Se puede deslizar en el celular y mover con las flechas del teclado.
- Sin torneos en curso o sin estadísticas, la sección no aparece; si la API falla, avisa con «Reintentar», como Partidos.

## Fuera de alcance

- Torneos finalizados o próximos y la figura de un partido o de una fecha (siguen en los flyers).
- Cambiar el cálculo de la figura.

## Criterios de aceptación

- [x] La ruta tiene casos de contrato y pruebas del caso de uso; no devuelve datos personales.
- [x] El carrusel tiene pruebas: avanza al terminar la barra, se pausa, las flechas y los puntos llevan a su figura, arranca en pausa con movimiento reducido y no aparece sin figuras.
- [x] Capturas en escritorio y celular con datos reales; `DESIGN.md` describe la sección.
- [x] `pytest`, `npm test`, build y prueba de humo en verde; el chunk inicial no crece más que el componente.
