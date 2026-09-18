# Guía de Instalación y Despliegue

Este documento explica cómo configurar y levantar el proyecto tanto en un entorno local (desarrollo) como en el servidor de producción.

---

## 💻 Entorno Local (Desarrollo)

Para desarrollar, necesitarás levantar tanto el servidor de Flask (Backend) como el servidor de desarrollo de Vite (Frontend) simultáneamente.

### Requisitos Previos
- Node.js (v18+)
- Python 3.12
- Git

### 1. Configurar el Backend (Flask)

1. Abre una terminal y navega a la carpeta del backend:
   ```bash
   cd backend
   ```
2. Crea un entorno virtual y actívalo:
   ```bash
   # En Windows:
   python -m venv .venv
   .venv\Scripts\activate
   
   # En macOS/Linux:
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Crea un archivo `.env` en la raíz de `backend/` con las credenciales de Supabase (solicítalas al administrador actual):
   ```env
   DATABASE_URL=postgresql://postgres.[tu-id]:[tu-password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   SUPABASE_URL=https://[tu-id].supabase.co
   SUPABASE_KEY=eyJhb...
   SUPABASE_JWT_SECRET=tu-secret-jwt
   S3_ENDPOINT=https://[tu-id].supabase.co/storage/v1/s3
   S3_ACCESS_KEY=...
   S3_SECRET_KEY=...
   S3_BUCKET=basquet-vinculacion
   ```
5. Levanta el servidor:
   ```bash
   python run.py
   # El backend estará escuchando en http://127.0.0.1:5000
   ```

### 2. Configurar el Frontend (React)

1. Abre *otra* terminal y navega a la carpeta del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias de NPM:
   ```bash
   npm install
   ```
3. Crea un archivo `.env` en la raíz de `frontend/` (opcional si todo está por defecto):
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SUPABASE_URL=https://[tu-id].supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhb...
   ```
4. Levanta el servidor de desarrollo:
   ```bash
   npm run dev
   # El frontend estará disponible en http://localhost:5173
   ```

---

## 🚀 Entorno de Producción (Servidor Ubuntu)

El proyecto está alojado en un servidor (VPS) con Ubuntu. Se utiliza **Nginx** para servir los archivos estáticos del frontend y hacer proxy inverso, y **Gunicorn + SystemD** para mantener vivo el backend.

### Estructura en el Servidor
Típicamente el proyecto vive en:
```text
/var/www/basquet_vinculacion/
```

### Actualización Automática (Deploy)
Si solo quieres actualizar el código en producción con los últimos cambios de la rama `main` de GitHub, conéctate por SSH al servidor y ejecuta:

```bash
cd /var/www/basquet_vinculacion
./deploy.sh
```

El script `./deploy.sh` hace lo siguiente automáticamente:
1. `git pull origin main` (Descarga los cambios).
2. Entra a `frontend/`, hace `npm install` y compila el proyecto con `npm run build`.
3. Entra a `backend/`, activa el `.venv`, actualiza `pip install` y corre migraciones.
4. Reinicia el servicio `basquet` (Gunicorn) y recarga `nginx`.

> **⚠️ Precaución con conflictos (Package-lock):**
> Si el script falla al hacer `git pull` porque dice que hay cambios locales en `package-lock.json` que serían sobrescritos, ejecuta esto antes de volver a correr el script:
> `git checkout -- frontend/package-lock.json`

### Comandos Útiles en Producción

Si necesitas administrar los servicios manualmente por SSH:

**Ver estado del Backend:**
```bash
sudo systemctl status basquet
```

**Ver logs de errores del Backend:**
```bash
sudo journalctl -u basquet -f
```

**Reiniciar manualmente Nginx:**
```bash
sudo systemctl restart nginx
```

**Probar la configuración de Nginx:**
```bash
sudo nginx -t
```
