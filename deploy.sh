#!/bin/bash
# Script de Actualización Automática para Producción
# Uso: ./deploy.sh
# Permisos requeridos: chmod +x deploy.sh (o ejecutar con: bash deploy.sh)

# Si cualquier paso falla, el despliegue se detiene y no reinicia los servicios
set -eo pipefail
trap 'echo ""; echo "❌ Despliegue detenido: falló el paso anterior. Los servicios NO se reiniciaron."' ERR

echo "========================================"
echo "🚀 INICIANDO DESPLIEGUE EN PRODUCCIÓN 🚀"
echo "========================================"

echo ""
echo "1. Descargando últimos cambios de GitHub..."
# --ff-only: si la rama del servidor divergió de GitHub, falla en vez de mezclar
git pull --ff-only origin main

echo ""
echo "2. Compilando el Frontend (React)..."
cd frontend
npm install
npm run build
cd ..

echo ""
echo "3. Actualizando dependencias del Backend y DB..."
cd backend
# Activar entorno virtual
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi

pip install -r requirements.txt
flask db upgrade
cd ..

echo ""
echo "4. Reiniciando los servicios del servidor..."
# Ajusta el nombre de tu servicio de Gunicorn/SystemD aquí
sudo systemctl restart basquet
sudo systemctl reload nginx

echo ""
echo "✅ ¡Actualización completada exitosamente!"
echo "========================================"
