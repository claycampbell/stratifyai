# Verification script for OGSM Manager deployment

Write-Host "`n=== OGSM Manager Deployment Verification ===" -ForegroundColor Cyan

# Check if containers are running
Write-Host "`n1. Checking Docker containers..." -ForegroundColor Yellow
docker-compose ps

# Test PostgreSQL
Write-Host "`n2. Testing PostgreSQL..." -ForegroundColor Yellow
$pgTest = docker exec ogsm_postgres pg_isready -U postgres
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ PostgreSQL is ready" -ForegroundColor Green
} else {
    Write-Host "   ✗ PostgreSQL is not ready" -ForegroundColor Red
}

# Test Backend API
Write-Host "`n3. Testing Backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 5
    $health = $response.Content | ConvertFrom-Json
    Write-Host "   ✓ Backend API is healthy" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
    Write-Host "   Service: $($health.service)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Backend API is not responding" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

# Test Frontend
Write-Host "`n4. Testing Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200 -and $response.Content -like "*OGSM Manager*") {
        Write-Host "   ✓ Frontend is serving correctly" -ForegroundColor Green
    } else {
        Write-Host "   ? Frontend response unexpected" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ Frontend is not responding" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

# Test API Root Endpoint
Write-Host "`n5. Testing API endpoints..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/documents" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✓ Documents API endpoint accessible" -ForegroundColor Green
} catch {
    Write-Host "   ✗ API endpoints not accessible" -ForegroundColor Red
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Frontend URL: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Green
Write-Host "API Health: http://localhost:5000/health" -ForegroundColor Green
Write-Host "`nYou can now access the application at http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
