# Fase 12 · Plan

## Backend (módulo estadísticas)

- `infrastructure/repositorio.py`: `torneos_en_curso()`, del que empezó antes al último.
- `application/estadisticas.py`: `figuras_en_curso(repositorio)` junta las `figuras_categoria` del flyer de cada torneo en curso con su torneo. Reusa el cálculo de los flyers tal cual; si la portada llega a pesar, una consulta propia (anotado con `ponytail:`).
- `http/esquemas.py`: `FiguraPublicaSchema`, que deja pasar solo los campos públicos aunque el diccionario del flyer sume otros.
- `http/estadisticas.py`: `GET /api/estadisticas/figuras`, sin token.
- Pruebas: el caso de uso con el repositorio falso de `test_estadisticas.py` y un caso de contrato (`GET /api/estadisticas/figuras · anónimo`).

## Frontend

- `modules/estadisticas`: `getFigurasEnCurso` y el tipo `FiguraDelTorneo`, exportados por su `index.ts` (portada ya depende de estadísticas).
- `modules/portada/components/SeccionFiguras.tsx`: la sección y el carrusel. Las tarjetas comparten una celda de grilla (la más alta da el alto) y un `transform` según su distancia a la del centro, que da la vuelta. El avance es la barra de progreso del carrusel de torneos (`progreso-slide`, aquí de 5 s, con `onAnimationEnd`): sin `setInterval`, y pausar es congelar la animación.
- `Home.tsx`: la sección después de Partidos. `Home.test.tsx` simula la API nueva y espera la sección en su lugar.
- `SeccionFiguras.test.tsx`: la tarjeta del centro, la frase de totales, el avance al terminar la barra, flechas, puntos, arrastre, pausa (botón y foco), movimiento reducido, sin figuras y error.
- `DESIGN.md` y `.agents/AGENTS.md`.

## Comprobación

- `pytest` (contrato con un caso más), `npm test`, build y prueba de humo (con la API vacía la sección no aparece: el humo queda igual a la base).
- Tamaños: el chunk inicial crece 6 bytes; la portada (`Home`), 9,5 KB.
- Capturas en 1440 px y 390 px con datos reales: build servido con `vite preview`, `/api` a gunicorn sobre un Postgres local con migraciones y seed.
