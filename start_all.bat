@echo off
setlocal
cd /d %~dp0

set PYTHON_EXE=%~dp0BACKEND\venv\Scripts\python.exe

if not exist "%PYTHON_EXE%" (
  echo [START] ERROR: No se encontro %PYTHON_EXE%
  echo [START] Crea el venv en BACKEND\venv e instala BACKEND\requirements.txt
  exit /b 1
)

"%PYTHON_EXE%" "%~dp0start_all.py"
set EXITCODE=%ERRORLEVEL%

endlocal & exit /b %EXITCODE%
