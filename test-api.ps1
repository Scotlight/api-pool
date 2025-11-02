# Test Gemini Proxy API

$baseUrl = "https://apikey.awve.dpdns.org"
$authKey = "sk-pool-paeg76mk7k4xell72za"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Gemini Proxy API" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Get Models
Write-Host "Test 1: GET /v1/models" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/v1/models" -Headers @{
        "Authorization" = "Bearer $authKey"
    } -Method GET -ErrorAction Stop
    Write-Host "✓ Status: $($response.StatusCode)" -ForegroundColor Green
    $models = ($response.Content | ConvertFrom-Json).data
    Write-Host "✓ Found $($models.Count) models" -ForegroundColor Green
    Write-Host "  First 3 models: $($models[0..2].id -join ', ')`n" -ForegroundColor Gray
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "  Response: $($_.ErrorDetails.Message)`n" -ForegroundColor Red
}

# Test 2: Chat Completion (Simple)
Write-Host "Test 2: POST /v1/chat/completions (non-streaming)" -ForegroundColor Yellow
try {
    $body = @{
        model = "gemini-2.5-flash"
        messages = @(
            @{
                role = "user"
                content = "Say 'Hello' in one word"
            }
        )
        stream = $false
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/v1/chat/completions" `
        -Headers @{
            "Authorization" = "Bearer $authKey"
            "Content-Type" = "application/json"
        } `
        -Method POST `
        -Body $body `
        -ErrorAction Stop

    Write-Host "✓ Status: $($response.StatusCode)" -ForegroundColor Green
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✓ Model: $($result.model)" -ForegroundColor Green
    Write-Host "✓ Response: $($result.choices[0].message.content)`n" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
    if ($_.ErrorDetails) {
        Write-Host "  Response: $($_.ErrorDetails.Message)`n" -ForegroundColor Red
    }
}

# Test 3: Check Admin Interface
Write-Host "Test 3: GET /admin (check if deployed)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin" -Method GET -ErrorAction Stop
    Write-Host "✓ Admin interface is accessible" -ForegroundColor Green
    Write-Host "✓ Status: $($response.StatusCode)`n" -ForegroundColor Green
} catch {
    Write-Host "✗ Cannot access admin interface" -ForegroundColor Red
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)`n" -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
