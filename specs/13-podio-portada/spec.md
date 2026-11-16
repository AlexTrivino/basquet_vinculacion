# Fase 13 · Portada: podio del torneo

## Problema

La portada cuenta los partidos y las figuras, pero no quién ganó. El campeón, el vicecampeón y el tercero ya se saben por las llaves (la final y el partido por el tercer puesto), pero solo se ven entrando al torneo. El primer prototipo de la sección (tres tarjetas) se veía aburrido; se pidió algo con más creatividad, parecido al podio de la ruta 3 de los flyers y con un efecto al pasar el cursor (15-11).

## Qué entrega

- `GET /api/torneos/podios`, pública: el podio de cada categoría del torneo más reciente que ya tenga alguno (del que termina último al primero, esté en curso, programado o finalizado). Campeón y vicecampeón salen de la final; el tercero, del partido por el tercer puesto o, en el formato de tres equipos, de quien perdió el repechaje. Sin la final jugada no hay podio. Sin formato de llaves, los tres primeros de la tabla única, solo con el torneo finalizado. Cada puesto trae el equipo (id, nombre y escudo), lo que hizo en todo el torneo (PJ, PG, PP, PF y PC, fase de grupos y llaves), sus sellos (`invicto` y `mas_puntos`) y el partido que lo definió (ronda, fecha, marcador propio y del rival, si fue W.O. y el rival). Sin ningún podio: `{"torneo": null, "podios": []}`.
- Una sección nueva en la portada, entre Partidos y Figuras: «Podio del torneo». Un escenario (el cartel) con el podio 2 · 1 · 3: escalones con el número del puesto, el medallón de cada escudo con el anillo de su metal (oro, plata y bronce) y el nombre. Un cono de luz sigue al escalón elegido: al pasar el cursor, enfocarlo o tocarlo, ese equipo queda bajo el foco y los otros se apagan. Debajo, la franja del cartel cuenta al equipo bajo el foco: puesto, nombre, sellos, totales y el partido que lo definió, con el enlace al torneo.
- Con varias categorías, píldoras para elegir el podio. Al llegar a la sección, los escalones salen del piso y los medallones caen sobre ellos; con movimiento reducido todo aparece quieto.
- Sin podio, un aviso; si la API falla, «Reintentar», como Partidos y Figuras.

## Fuera de alcance

- La foto del campeón en el podio y en los flyers (fase 14).
- Podios de torneos anteriores al más reciente.
- Cambiar cómo se arman las llaves o la tabla.

## Criterios de aceptación

- [x] La ruta tiene un caso de contrato y pruebas del caso de uso: final y tercer puesto, repechaje, W.O., sellos, el torneo que se elige y la tabla sin llaves.
- [x] La sección tiene pruebas: el podio 2 · 1 · 3 con el campeón bajo el foco, el foco al tocar, enfocar y pasar el cursor, las categorías, el escalón por definir, la tabla sin llaves, sin podio y error.
- [x] Capturas en escritorio (también con el cursor encima) y celular con los datos reales del torneo 5; `DESIGN.md` describe la sección.
- [x] `pytest`, `npm test`, build y prueba de humo en verde; el chunk inicial no crece.
