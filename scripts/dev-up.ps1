# Starts everything needed for local development: Docker infra (redis), the FastAPI
# backend, and the Next.js frontend. Postgres and Qdrant are both managed/remote
# (Neon, Qdrant Cloud) - no local containers for either. Run from anywhere; paths
# are resolved relative to this script's location.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\dev-up.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "== TRACE dev environment ==" -ForegroundColor Cyan

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

# --- 1. Docker Desktop + redis -----------------------------------------
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
    Write-Host "Starting redis container..." -ForegroundColor Green
    docker compose -f "$root\infra\docker-compose.yml" up -d redis
} else {
    Write-Host "Skipping redis - Docker not available." -ForegroundColor Red
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
