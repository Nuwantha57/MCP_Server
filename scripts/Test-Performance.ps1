<#
.SYNOPSIS
    Performance and Load Testing Script for MCP Server

.DESCRIPTION
    Tests the MCP server with concurrent requests and measures response times.

.PARAMETER BaseUrl
    The base URL of the MCP server (default: http://localhost:5000)

.PARAMETER ApiKey
    The API key for authentication

.PARAMETER ConcurrentRequests
    Number of concurrent requests (default: 50)

.EXAMPLE
    .\Test-Performance.ps1 -BaseUrl "http://localhost:5000" -ApiKey "dev-api-key-12345"
#>

param(
    [string]$BaseUrl = "http://localhost:5000",
    [string]$ApiKey = "dev-api-key-12345",
    [int]$ConcurrentRequests = 50,
    [int]$TotalRequests = 200
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MCP Server Performance Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl"
Write-Host "Concurrent Requests: $ConcurrentRequests"
Write-Host "Total Requests: $TotalRequests"
Write-Host ""

# Test 1: Health Check Endpoint
Write-Host "TEST 1: Health Check Endpoint" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$healthResults = @()
$sw = [System.Diagnostics.Stopwatch]::StartNew()

for ($i = 0; $i -lt 10; $i++) {
    $start = [DateTime]::Now
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/health" -UseBasicParsing -TimeoutSec 10
        $elapsed = ([DateTime]::Now - $start).TotalMilliseconds
        $healthResults += $elapsed
    } catch {
        Write-Host "Health check failed: $_" -ForegroundColor Red
    }
}

if ($healthResults.Count -gt 0) {
    Write-Host "  Min: $([math]::Round(($healthResults | Measure-Object -Minimum).Minimum, 2)) ms"
    Write-Host "  Max: $([math]::Round(($healthResults | Measure-Object -Maximum).Maximum, 2)) ms"
    Write-Host "  Avg: $([math]::Round(($healthResults | Measure-Object -Average).Average, 2)) ms"
    Write-Host "  Status: PASS" -ForegroundColor Green
}
Write-Host ""

# Test 2: Tools List Endpoint (with auth)
Write-Host "TEST 2: Tools List Endpoint (authenticated)" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$toolsResults = @()
$headers = @{ 
    "Accept" = "application/json, text/event-stream"
    "x-api-key" = $ApiKey 
}
$body = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

for ($i = 0; $i -lt 10; $i++) {
    $start = [DateTime]::Now
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/" -Method POST -Headers $headers -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
        $elapsed = ([DateTime]::Now - $start).TotalMilliseconds
        $toolsResults += $elapsed
    } catch {
        Write-Host "Tools list failed: $_" -ForegroundColor Red
    }
}

if ($toolsResults.Count -gt 0) {
    Write-Host "  Min: $([math]::Round(($toolsResults | Measure-Object -Minimum).Minimum, 2)) ms"
    Write-Host "  Max: $([math]::Round(($toolsResults | Measure-Object -Maximum).Maximum, 2)) ms"
    Write-Host "  Avg: $([math]::Round(($toolsResults | Measure-Object -Average).Average, 2)) ms"
    Write-Host "  Status: PASS" -ForegroundColor Green
}
Write-Host ""

# Test 3: Tool Execution (Echo)
Write-Host "TEST 3: Tool Execution (echo)" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$echoResults = @()
$echoBody = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"echo","arguments":{"message":"Performance test message"}}}'

for ($i = 0; $i -lt 10; $i++) {
    $start = [DateTime]::Now
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/" -Method POST -Headers $headers -Body $echoBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
        $elapsed = ([DateTime]::Now - $start).TotalMilliseconds
        $echoResults += $elapsed
    } catch {
        Write-Host "Echo tool failed: $_" -ForegroundColor Red
    }
}

if ($echoResults.Count -gt 0) {
    Write-Host "  Min: $([math]::Round(($echoResults | Measure-Object -Minimum).Minimum, 2)) ms"
    Write-Host "  Max: $([math]::Round(($echoResults | Measure-Object -Maximum).Maximum, 2)) ms"
    Write-Host "  Avg: $([math]::Round(($echoResults | Measure-Object -Average).Average, 2)) ms"
    Write-Host "  Status: PASS" -ForegroundColor Green
}
Write-Host ""

# Test 4: Concurrent Load Test
Write-Host "TEST 4: Concurrent Load Test ($ConcurrentRequests concurrent, $TotalRequests total)" -ForegroundColor Yellow
Write-Host "----------------------------------------"

$scriptBlock = {
    param($url, $headers, $body)
    $start = [DateTime]::Now
    try {
        $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
        $elapsed = ([DateTime]::Now - $start).TotalMilliseconds
        return @{ Success = $true; Time = $elapsed; Status = $response.StatusCode }
    } catch {
        $elapsed = ([DateTime]::Now - $start).TotalMilliseconds
        return @{ Success = $false; Time = $elapsed; Error = $_.Exception.Message }
    }
}

$jobs = @()
$loadResults = @()
$successCount = 0
$failCount = 0

$loadStart = [DateTime]::Now

# Create batches of concurrent requests
$batches = [math]::Ceiling($TotalRequests / $ConcurrentRequests)

for ($batch = 0; $batch -lt $batches; $batch++) {
    $batchJobs = @()
    $batchSize = [math]::Min($ConcurrentRequests, $TotalRequests - ($batch * $ConcurrentRequests))
    
    Write-Host "  Running batch $($batch + 1)/$batches ($batchSize requests)..." -ForegroundColor Gray
    
    for ($i = 0; $i -lt $batchSize; $i++) {
        $job = Start-Job -ScriptBlock $scriptBlock -ArgumentList "$BaseUrl/", $headers, $echoBody
        $batchJobs += $job
    }
    
    # Wait for batch to complete
    $batchJobs | Wait-Job | Out-Null
    
    foreach ($job in $batchJobs) {
        $result = Receive-Job -Job $job
        if ($result.Success) {
            $successCount++
            $loadResults += $result.Time
        } else {
            $failCount++
        }
        Remove-Job -Job $job
    }
}

$loadEnd = [DateTime]::Now
$totalTime = ($loadEnd - $loadStart).TotalSeconds

Write-Host ""
Write-Host "  Results:" -ForegroundColor White
Write-Host "  ---------"
Write-Host "  Total Requests: $TotalRequests"
Write-Host "  Successful: $successCount" -ForegroundColor Green
Write-Host "  Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host "  Total Time: $([math]::Round($totalTime, 2)) seconds"
Write-Host "  Requests/sec: $([math]::Round($TotalRequests / $totalTime, 2))"

if ($loadResults.Count -gt 0) {
    $sorted = $loadResults | Sort-Object
    $p50 = $sorted[[math]::Floor($sorted.Count * 0.5)]
    $p90 = $sorted[[math]::Floor($sorted.Count * 0.9)]
    $p99 = $sorted[[math]::Floor($sorted.Count * 0.99)]
    
    Write-Host ""
    Write-Host "  Response Times:" -ForegroundColor White
    Write-Host "  Min: $([math]::Round(($loadResults | Measure-Object -Minimum).Minimum, 2)) ms"
    Write-Host "  Max: $([math]::Round(($loadResults | Measure-Object -Maximum).Maximum, 2)) ms"
    Write-Host "  Avg: $([math]::Round(($loadResults | Measure-Object -Average).Average, 2)) ms"
    Write-Host "  P50: $([math]::Round($p50, 2)) ms"
    Write-Host "  P90: $([math]::Round($p90, 2)) ms"
    Write-Host "  P99: $([math]::Round($p99, 2)) ms"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Performance Test Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Performance grade
$avgResponse = ($loadResults | Measure-Object -Average).Average
if ($avgResponse -lt 100) {
    Write-Host "Grade: EXCELLENT (avg < 100ms)" -ForegroundColor Green
} elseif ($avgResponse -lt 300) {
    Write-Host "Grade: GOOD (avg < 300ms)" -ForegroundColor Yellow
} elseif ($avgResponse -lt 1000) {
    Write-Host "Grade: ACCEPTABLE (avg < 1000ms)" -ForegroundColor Yellow
} else {
    Write-Host "Grade: NEEDS IMPROVEMENT (avg > 1000ms)" -ForegroundColor Red
}
