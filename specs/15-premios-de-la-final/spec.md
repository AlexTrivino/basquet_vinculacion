# Fase 15 · Los premios de la final: MVP y mejor defensa

## Problema

Además del podio, el organizador publica dos flyers de la final de cada categoría: el **MVP de la final** y el **mejor defensa de la final**. Los dos salen de ese partido, pero el sistema no los conoce:

- El MVP es del equipo campeón. No siempre es el de mejor valoración del acta, así que el admin tiene que poder **elegir al jugador**.
- El mejor defensa también sale de la final y también se elige. Su flyer tiene que mostrar los **rebotes y los tapones** que hizo en ese juego.
- Cada flyer lleva la **foto del premiado**, que sube el admin.

Hoy el Estudio de flyers no tiene ninguno de los dos y la base no guarda quién ganó cada premio.

## Qué entrega

- **Una tabla nueva, `premios_final`:** un premio por categoría y tipo (`mvp` o `defensa`) con el jugador elegido y, si el admin la subió, su foto con el encuadre (el mismo modelo de la fase 14: ancho, alto, foco en X y en Y de 0 a 100 % y zoom de 1 a 3). La foto es del premiado: si el admin cambia de jugador, la foto del anterior se borra.
- **Quiénes se pueden elegir (los candidatos):** los jugadores con estadísticas cargadas en el partido de la final (la llave `F` de la categoría). Para el MVP, solo los del equipo campeón; para el mejor defensa, los de los dos finalistas. El equipo de cada jugador sale de su plantilla del torneo. Cada lista va de mejor a peor y el primero es el que el sistema **sugiere**:
  - MVP: la mayor valoración del partido (puntos + rebotes + asistencias + tapones, la misma de los flyers de figuras); en empate, más puntos.
  - Mejor defensa: más rebotes + tapones; en empate, más tapones y después la mayor valoración.
- **Elegir al jugador:** un selector en el Estudio con los números de cada candidato en la final. Se guarda al cambiarlo. Mientras el admin no elija, el flyer lleva al sugerido (sin guardar nada).
- **Foto del premiado:** igual que la del podio. El navegador avisa al instante y el servidor revisa de verdad (tipo real por sus primeros bytes, hasta 4 MB, de 1080 × 608 a 8000 × 8000 px, hasta 40 megapíxeles; la endereza, le quita el EXIF y la guarda en WebP a 2560 px como máximo). Mismo editor de recorte (arrastrar, zoom, flechas, «Centrar»), un solo encuadre para estados y redes. Una foto por premio: subir otra reemplaza la anterior y borra su archivo. Si el admin sube la foto sin haber elegido, se guarda como elegido el sugerido. Sin foto del premio, el flyer usa la del jugador (la de su ficha) y, si tampoco hay, la silueta con su dorsal, como en los flyers de figuras.
- **Dos tipos nuevos en el Estudio de flyers:** «MVP de la final» y «Mejor defensa de la final», por torneo y categoría (aparecen las categorías con la final jugada y sus estadísticas cargadas), en estados 9:16 y redes 4:5, con la familia visual del podio (marino, oro y crema; Cinzel e Inter; el logo de la Copa):
  - **MVP:** la palabra MVP arriba de la foto (nada tapa la foto), el nombre del jugador con el escudo de su equipo, el resultado de la final («Final · 2 nov · 58 – 55 ante Spellman») y sus números del partido: puntos, triples, rebotes, asistencias y tapones (el que está en 0 no sale).
  - **Mejor defensa:** la palabra DEFENSA con «MEJOR» encima, la misma identificación y, en grande, los **rebotes** y los **tapones** del partido (el que está en 0 no sale; si los dos están en 0, no hay franja de números).
- **Descripción para Instagram** de cada flyer, con el botón «Copiar texto» de siempre.

## Fuera de alcance

- Los **robos**: el acta del sistema no los guarda, así que no se pueden mostrar.
- Premios de todo el torneo (MVP del torneo) y mostrar los premios en la portada pública. La ruta de lectura es solo del super_admin porque la elección no está publicada hasta que se publica el flyer.
- Categorías sin fase final (su podio sale de la tabla; no hay «final») y finales definidas por W.O. (sin partido jugado no hay estadísticas ni a quién premiar).
- Editar la foto (filtros, quitar el fondo) y galerías.

## Criterios de aceptación

- [x] La migración crea `premios_final` solo si no existe (la tabla puede haberse creado a mano con la query de producción) y, en PostgreSQL, le habilita RLS. La query de producción se prueba dos veces seguidas en un PostgreSQL local.
- [x] Los candidatos salen del partido de la final: el MVP solo del campeón, el mejor defensa de los dos finalistas, ordenados como se dijo, y las categorías sin final jugada (o por W.O.) no aparecen.
- [x] Solo un candidato se puede elegir: un jugador de otro equipo, de otra categoría o sin estadísticas en la final se rechaza con su mensaje y su prueba. Cambiar de jugador borra la foto del anterior (la fila y el archivo del bucket).
- [x] Cada rechazo de la foto tiene su mensaje y su prueba (los mismos de la fase 14, más «elige primero al jugador»), y un delegado no puede elegir, subir, ajustar ni quitar.
- [x] El flyer de cada premio se ve bien en estados y redes con y sin foto del premio, con nombres largos y con números en 0; los textos no bajan de 20 px y las zonas seguras de estados (250 px arriba y abajo) quedan libres.
- [x] El Estudio elige al jugador, sube la foto, ajusta el recorte, la quita y descarga los PNG; el texto para Instagram cuenta lo mismo que el flyer.
- [x] Casos de contrato de las rutas nuevas; `pytest`, `npm test`, build y prueba de humo en verde.
