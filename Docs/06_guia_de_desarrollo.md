# Guía de Desarrollo y Pruebas

Esta guía contiene los comandos y flujos de trabajo diarios que necesitarás para modificar el código sin romper funcionalidades existentes.

---

## 1. Pruebas Automatizadas (Testing)

El proyecto cuenta con suites de pruebas tanto en el frontend como en el backend. **Es obligatorio ejecutar las pruebas antes de subir cambios a producción.**

### Backend (Pytest)
Las pruebas del backend validan principalmente la lógica matemática del motor de estadísticas (cálculo de posiciones, desempates FIBA) y la validación de DTOs.

Para ejecutarlas:
```bash
cd backend
pytest
```
*Si quieres ver la cobertura o logs detallados:*
```bash
pytest -v
```

### Frontend (Vitest + React Testing Library)
Las pruebas del frontend validan los componentes visuales clave (tablas responsivas, botones asíncronos y guardias de rutas protegidas).

Para ejecutarlas:
```bash
cd frontend
npm run test
```
*Nota: Vitest se ejecuta en modo observador (watch mode) por defecto. Usa `q` para salir.*

---

## 2. Migraciones de Base de Datos (Alembic)

Flask está configurado con Flask-Migrate (Alembic). **Nunca modifiques las tablas directamente en Supabase con SQL si no es estrictamente necesario.** Usa siempre migraciones.

### Crear una nueva migración
Si añades una columna o modificas un modelo en `backend/app/models/`:
```bash
cd backend
flask db migrate -m "Añadida columna X a tabla Y"
```
Esto generará un archivo Python en `backend/migrations/versions/`. Revisa el archivo para asegurarte de que Alembic detectó bien el cambio.

### Aplicar la migración (Actualizar la BD)
Para aplicar los cambios a tu base de datos local (o en producción):
```bash
cd backend
flask db upgrade
```

---

## 3. Uso de Seeders (Poblar datos falsos)

Si tu base de datos local está vacía y necesitas empezar a probar rápidamente, el proyecto cuenta con un script que genera categorías, torneos y equipos de prueba automáticamente.

Para ejecutarlo:
```bash
cd backend
python seed_database.py
```
*(Advertencia: Dependiendo de cómo esté programado el seeder, podría requerir que la base de datos esté vacía previamente para no generar conflictos de llaves únicas).*

---

## 4. Reglas de Calidad de Código (Linting)

Si el proyecto lanza errores de formato al intentar hacer un commit (si existieran hooks pre-commit), puedes formatear el código manualmente:

**En el Backend (Python):**
El proyecto usa las reglas estrictas de `flake8`.
```bash
cd backend
flake8 .
```

**En el Frontend (TypeScript/React):**
```bash
cd frontend
npm run lint
```
