# Constitución de la migración

Siete reglas que ninguna tarea puede romper. Si una tarea necesita romper una, primero se escribe una especificación nueva.

1. **Paridad.** Mismas rutas, métodos, códigos HTTP y JSON en `/api`, mismo esquema de base de datos y mismas pantallas. Un cambio de comportamiento, aunque sea un arreglo, va en otra especificación.
2. **De a un módulo.** Cada módulo se migra en su propio commit y el sistema se puede desplegar después de cada uno. El código viejo y el nuevo conviven hasta que el módulo termina.
3. **Red primero.** Antes de mover un módulo existen pruebas de contrato de sus endpoints (`backend/tests/contrato`). `pytest` y `npm test` pasan en cada commit.
4. **Regla de dependencia.** En el backend, `domain` solo importa los errores de `shared/domain`, nunca Flask, SQLAlchemy, boto3 ni jwt; `application` solo importa `domain`. En el frontend, un módulo se importa solo por su `index.ts` y `shared` no importa módulos.
5. **Lo mínimo que funciona.** Sin framework de inyección de dependencias, sin una interfaz por clase, sin CQRS ni eventos. Un caso de uso es una función; un puerto existe solo donde hay que sustituir algo en pruebas (base de datos, almacenamiento, autenticación).
6. **Reglas que se verifican solas.** Las capas y fronteras se comprueban con pruebas, sin dependencias nuevas: `backend/tests/test_capas.py` y `frontend/src/fronteras.test.ts`.
7. **Documentado al cerrar.** Cada módulo terminado actualiza `.agents/AGENTS.md` y el README con su estructura.
