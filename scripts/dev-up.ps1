# Starts everything needed for local development: Docker infra (Postgres, Qdrant, Redis),
# the FastAPI backend, and the Next.js frontend. All data services run locally in
# containers - there is no cloud dependency. Run from anywhere; paths are resolved
# relative to this script's location.
#
# First-time setup also needs (once the containers are up):
#   python -m alembic upgrade head
#   python scripts\seed_db.py
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\dev-up.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "== DataAxle dev environment ==" -ForegroundColor Cyan

# --- 0. Kill anything already bound to the dev ports --------------------------
Write-Host "Freeing ports 3000 (web) and 8000 (api)..." -ForegroundColor Yellow
foreach ($port in 3000, 8000) {
    $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        try {
            Stop-Process -Id $procId -Force -Confirm:$false -ErrorAction Stop
            Write-Host "  Killed PID $procId on port $port" -ForegroundColor Yellow
        } catch {
            # Stop-Process can fail on Windows for processes with child watchers (e.g. uvicorn --reload).
            # Fall back to taskkill /T to also terminate the process tree.
            taskkill /PID $procId /T /F *>$null
            if ($?) {
                Write-Host "  Killed PID $procId on port $port (via taskkill)" -ForegroundColor Yellow
            } else {
                Write-Host "  Could not kill PID $procId on port $port" -ForegroundColor Red
            }
        }
    }
}

# --- 1. Docker Desktop + infra containers ------------------------------
function Test-DockerRunning {
    try {
        docker info *>$null
        return $true
    } catch {
        return $false
    }
}

$dockerOk = Test-DockerRunning

if (-not $dockerOk) {
    Write-Host "Docker daemon not running, starting Docker Desktop..." -ForegroundColor Yellow
    $dockerExe = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerExe) {
        Start-Process $dockerExe
        Write-Host "Waiting for Docker daemon (up to 90s)..."
        $waited = 0
        while ($waited -lt 90) {
            Start-Sleep -Seconds 3
            $waited += 3
            if (Test-DockerRunning) { $dockerOk = $true; break }
        }
    } else {
        Write-Host "Docker Desktop.exe not found - start it manually, then re-run this script." -ForegroundColor Red
    }
}

if ($dockerOk) {
    Write-Host "Starting postgres, qdrant and redis containers..." -ForegroundColor Green
    docker compose -f "$root\infra\docker-compose.yml" up -d
} else {
    Write-Host "Skipping infra containers - Docker not available. The API cannot reach Postgres/Qdrant without them." -ForegroundColor Red
}

# --- 2. FastAPI backend --------------------------------------------------------
Write-Host "Starting FastAPI backend (new window)..." -ForegroundColor Green
$apiPython = Join-Path $root "services\api\.venv\Scripts\python.exe"
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$root'; & '$apiPython' -m uvicorn services.api.main:app --reload --port 8000"
)

# --- 3. Next.js frontend --------------------------------------------------------
Write-Host "Starting Next.js frontend (new window)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$root\apps\web'; npm run dev"
)

Write-Host ""
Write-Host "== Started. See DEV_SERVERS.md for the full list of local URLs. ==" -ForegroundColor Cyan
Write-Host "  Frontend : http://localhost:3000"
Write-Host "  API      : http://localhost:8000  (docs at /docs)"
