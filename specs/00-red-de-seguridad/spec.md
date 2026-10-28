# Fase 0 · Red de seguridad

## Problema

Hoy no hay forma automática de saber si mover código cambia lo que responde la API, ni de comprobar que las capas y las fronteras se respetan. Sin eso, cada fase de la migración depende de revisar a ojo.

## Qué entrega

- Pruebas de contrato de los 86 endpoints de `/api`: cada respuesta de hoy queda grabada (código HTTP y JSON) y cualquier diferencia hace fallar `pytest`.
- Una prueba de capas del backend y una prueba de fronteras del frontend que ya rigen para la estructura nueva y no dejan empeorar la vieja.
- El alias `@/` en el frontend, para que los módulos se importen como `@/modules/<nombre>`.

## Fuera de alcance

- Mover o cambiar código de la aplicación.
- Arreglar comportamientos raros: se graban tal como están; arreglarlos es otra especificación.

## Criterios de aceptación

- [x] Cada ruta y método de la API (86) tiene al menos un caso de contrato; una prueba falla si aparece una ruta sin caso.
- [x] Cada ruta protegida tiene, además, un caso sin token (401); las de super_admin, uno con otro rol (403).
- [x] Las rutas públicas que muestran más datos a quien tiene permiso (jugadores, plantillas) tienen un caso anónimo y uno con permiso.
- [x] Las referencias se generan con el código de `fe47e53` y la prueba pasa sin tocar la aplicación.
- [x] Las referencias no dependen de la fecha ni del azar: la fecha de hoy, las edades y los nombres de archivos subidos se normalizan.
- [x] Ninguna prueba sale a la red: el almacenamiento de Supabase es falso.
- [x] `test_capas.py`: estricto para `app/modules` y `app/shared`; para lo viejo, las líneas de `app/routes` que usan el ORM no pasan de 61.
- [x] `fronteras.test.ts`: estricto para `src/modules`, `src/shared` y `src/app`; para lo viejo, los imports a archivos internos de otra feature no pasan de 33.
- [x] `pytest`, `npm test` y `npm run build` en verde.
