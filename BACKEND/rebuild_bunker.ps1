Write-Host "--- INICIANDO PROTOCOLO DE RECONSTRUCCION ULTRA ---" -ForegroundColor Cyan

# 1. MATAR PROCESOS (Más agresivo)
Write-Host "[1/5] Limpiando memoria y procesos de Python..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { $_.Name -eq "python" -or $_.Name -eq "uvicorn" }
if ($processes) {
    Stop-Process -Id $processes.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# 2. DEMOLICIÓN (Con reintentos)
Write-Host "[2/5] Eliminando entorno virtual antiguo..." -ForegroundColor Yellow
if (Test-Path ".\backend\venv") {
    try {
        Remove-Item -Recurse -Force ".\backend\venv" -ErrorAction Stop
    } catch {
        Write-Host "Windows bloquea el venv. Intentando borrado forzado..." -ForegroundColor Magenta
        Start-Sleep -Seconds 3
        Remove-Item -Recurse -Force ".\backend\venv" -ErrorAction SilentlyContinue
    }
}

# 3. CONSTRUCCIÓN
Write-Host "[3/5] Creando nuevo entorno virtual..." -ForegroundColor Yellow
cd backend
python -m venv venv

# 4. SUMINISTROS
Write-Host "[4/5] Instalando dependencias seguras..." -ForegroundColor Yellow
$pip = ".\venv\Scripts\pip.exe"
$python = ".\venv\Scripts\python.exe"

& $python -m pip install --upgrade pip setuptools
& $pip install -r requirements.txt

# 5. INSPECCIÓN FINAL
Write-Host "[5/5] Ejecutando auditoria de seguridad..." -ForegroundColor Yellow
$audit = ".\venv\Scripts\pip-audit.exe"
if (Test-Path $audit) {
    & $audit
} else {
    Write-Host "Error: pip-audit no se instalo correctamente." -ForegroundColor Red
}

Write-Host "--- PROTOCOLO FINALIZADO CON EXITO ---" -ForegroundColor Cyan
cd ..
