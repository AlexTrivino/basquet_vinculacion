@echo off
rem Levanta el backend (Flask :5000) y el frontend (Vite :5173) en dos ventanas.
rem La primera vez crea el .venv e instala dependencias. Usa backend\.env tal cual.
cd /d "%~dp0"
rem ponytail: prefiere el lanzador py (esquiva el alias de la Microsoft Store); python queda de respaldo
set "PY="
py -3 --version >nul 2>&1 && set "PY=py -3"
if not defined PY python --version >nul 2>&1 && set "PY=python"
if not defined PY (
  echo No se encontro Python. Instalalo con este comando y vuelve a abrir este archivo:
  echo   winget install -e --id Python.Python.3.12
  pause
  exit /b 1
)
start "Backend - Flask :5000" cmd /k "cd backend & (if not exist .venv\Scripts\python.exe %PY% -m venv .venv) & .venv\Scripts\python -m pip install -q -r requirements.txt && .venv\Scripts\python run.py"
start "Frontend - Vite :5173" cmd /k "cd frontend & npm install --no-audit --no-fund && npm run dev"
