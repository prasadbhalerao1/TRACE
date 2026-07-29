# Starts everything needed for local development: Docker infra (redis, qdrant),
# the FastAPI backend, and the Next.js frontend. Run from anywhere; paths are
# resolved relative to this script's location.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\dev-up.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "== DataAxle dev environment ==" -ForegroundColor Cyan

# --- 1. Docker Desktop + redis/qdrant -----------------------------------------
$dockerOk = $true
try {
    docker info 2>$null | Out-Null
} catch {
    $dockerOk = $false
}

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
            docker info 2>$null | Out-Null
            if ($?) { $dockerOk = $true; break }
        }
    } else {
        Write-Host "Docker Desktop.exe not found — start it manually, then re-run this script." -ForegroundColor Red
    }
}

if ($dockerOk) {
    Write-Host "Starting redis + qdrant containers..." -ForegroundColor Green
    docker compose -f "$root\infra\docker-compose.yml" up -d redis qdrant
} else {
    Write-Host "Skipping redis/qdrant — Docker not available." -ForegroundColor Red
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
Write-Host "  Qdrant   : http://localhost:6333/dashboard"
