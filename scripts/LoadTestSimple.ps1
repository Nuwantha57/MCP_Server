#Requires -Version 5.1
<#
.SYNOPSIS
    Comprehensive Load Test - 50 Concurrent Requests
#>

param(
    [string]$BaseUrl = "http://localhost:5000",
    [int]$Concurrency = 50,
    [string]$ApiKey = "test-api-key-12345"
)

$ErrorActionPreference = "Continue"
$results = @()
$startTime = Get-Date

# Test endpoints
$endpoints = @(
    @{ endpoint = "/api/tools/echo"; method = "POST"; body = '{"message":"load-test"}'; auth = $true },
    @{ endpoint = "/api/tools/reverse"; method = "POST"; body = '{"text":"loadtest"}'; auth = $true },
    @{ endpoint = "/api/tools/add"; method = "POST"; body = '{"a":100,"b":200}'; auth = $true },
    @{ endpoint = "/api/tools/getDateTime"; method = "POST"; body = '{"offsetHours":0}'; auth = $true },
    @{ endpoint = "/api/tools/analyzeText"; method = "POST"; body = '{"text":"load testing"}'; auth = $true },
    @{ endpoint = "/health"; method = "GET"; body = $null; auth = $false },
    @{ endpoint = "/info"; method = "GET"; body = $null; auth = $false }
)

Write-Host ""
Write-Host "========================================"
Write-Host "MCP Server Load Test - 50 Concurrent"
Write-Host "========================================"
Write-Host ""
Write-Host "Starting at: $(Get-Date -Format 'HH:mm:ss.fff')"
Write-Host "Sending 50 concurrent requests..."
Write-Host ""

$scriptBlock = {
    param($endpoint, $BaseUrl, $ApiKey)
    
    $url = "$BaseUrl$($endpoint.endpoint)"
    $headers = @{ "Content-Type" = "application/json" }
    if ($endpoint.auth) { $headers["x-api-key"] = $ApiKey }
    
    $reqStart = Get-Date
    try {
        $params = @{
            Uri = $url
            Method = $endpoint.method
            Headers = $headers
            TimeoutSec = 30
            ErrorAction = "Stop"
            UseBasicParsing = $true
        }
        if ($endpoint.body -and $endpoint.method -eq "POST") {
            $params.Body = $endpoint.body
        }
        $response = Invoke-WebRequest @params
        $reqEnd = Get-Date
        
        @{
            endpoint = $endpoint.endpoint
            success = $true
            code = $response.StatusCode
            duration = ($reqEnd - $reqStart).TotalMilliseconds
            error = $null
        }
    }
    catch {
        $reqEnd = Get-Date
        @{
            endpoint = $endpoint.endpoint
            success = $false
            code = 0
            duration = ($reqEnd - $reqStart).TotalMilliseconds
            error = $_.Exception.Message
        }
    }
}

# Launch 50 concurrent jobs
$jobs = @()
for ($i = 1; $i -le $Concurrency; $i++) {
    $ep = $endpoints[($i - 1) % $endpoints.Count]
    $job = Start-Job -ScriptBlock $scriptBlock -ArgumentList $ep, $BaseUrl, $ApiKey
    $jobs += $job
}

# Wait for completion
$completed = 0
foreach ($job in $jobs) {
    $result = Receive-Job -Job $job -Wait
    $results += $result
    $completed++
    if ($completed % 10 -eq 0) {
        Write-Host "  Complete: $completed requests"
    }
}
Get-Job | Remove-Job -Force

$endTime = Get-Date
$totalTime = ($endTime - $startTime).TotalSeconds

Write-Host ""
Write-Host "========================================"
Write-Host "RESULTS SUMMARY"
Write-Host "========================================"
Write-Host ""

$successful = @($results | Where-Object { $_.success -eq $true }).Count
$failed = @($results | Where-Object { $_.success -eq $false }).Count
$successRate = if ($results.Count -gt 0) { ($successful / $results.Count) * 100 } else { 0 }

Write-Host "Total Requests:     $($results.Count)"
Write-Host "Successful:         $successful"
Write-Host "Failed:             $failed"
Write-Host "Success Rate:       $('{0:N2}' -f $successRate)%"
Write-Host "Total Duration:     $('{0:N2}' -f $totalTime)s"
Write-Host "Throughput:         $('{0:N2}' -f ($results.Count / $totalTime)) req/sec"
Write-Host ""

# Response time analysis
$durations = $results.Duration | Sort-Object
if ($durations.Count -gt 0) {
    $minDur = $durations[0]
    $maxDur = $durations[-1]
    $avgDur = ($durations | Measure-Object -Average).Average
    $medianDur = $durations[[int]($durations.Count / 2)]
    $p95idx = [int]($durations.Count * 0.95)
    $p99idx = [int]($durations.Count * 0.99)
    $p95Dur = $durations[$p95idx]
    $p99Dur = $durations[$p99idx]
    
    Write-Host "RESPONSE TIME METRICS:"
    Write-Host "  Min:      $('{0:N2}' -f $minDur)ms"
    Write-Host "  Max:      $('{0:N2}' -f $maxDur)ms"
    Write-Host "  Average:  $('{0:N2}' -f $avgDur)ms"
    Write-Host "  Median:   $('{0:N2}' -f $medianDur)ms"
    Write-Host "  P95:      $('{0:N2}' -f $p95Dur)ms"
    Write-Host "  P99:      $('{0:N2}' -f $p99Dur)ms"
}

# Status code breakdown
Write-Host ""
Write-Host "STATUS CODES:"
$statusGroups = $results | Group-Object -Property code | Sort-Object -Property Name
foreach ($group in $statusGroups) {
    Write-Host "  Code $($group.Name): $($group.Count) requests"
}

# Endpoint breakdown
Write-Host ""
Write-Host "BY ENDPOINT:"
$endpointGroups = $results | Group-Object -Property endpoint
foreach ($group in $endpointGroups | Sort-Object -Property Name) {
    $epResults = $group.Group
    $epSuccess = @($epResults | Where-Object { $_.success -eq $true }).Count
    $epDurations = @($epResults.Duration | Sort-Object)
    $epAvg = if ($epDurations.Count -gt 0) { ($epDurations | Measure-Object -Average).Average } else { 0 }
    $epSuccessRate = if ($epResults.Count -gt 0) { ($epSuccess / $epResults.Count) * 100 } else { 0 }
    
    Write-Host "  $($group.Name):"
    Write-Host "    Count: $($group.Count), Success: $('{0:N1}' -f $epSuccessRate)%, AvgTime: $('{0:N0}' -f $epAvg)ms"
}

# Summary assessment
Write-Host ""
Write-Host "PERFORMANCE ASSESSMENT:"
if ($successRate -eq 100) {
    Write-Host "  [PASS] Reliability: 100% success rate (excellent)"
} else {
    Write-Host "  [WARN] Reliability: $('{0:N1}' -f $successRate)% success rate"
}

if ($avgDur -lt 100) {
    Write-Host "  [PASS] Latency: Avg $('{0:N0}' -f $avgDur)ms (excellent)"
} elseif ($avgDur -lt 500) {
    Write-Host "  [PASS] Latency: Avg $('{0:N0}' -f $avgDur)ms (good)"
} else {
    Write-Host "  [WARN] Latency: Avg $('{0:N0}' -f $avgDur)ms (slow)"
}

if ($p95Dur -lt 500) {
    Write-Host "  [PASS] P95 Latency: $('{0:N0}' -f $p95Dur)ms (excellent)"
} elseif ($p95Dur -lt 1000) {
    Write-Host "  [PASS] P95 Latency: $('{0:N0}' -f $p95Dur)ms (good)"
} else {
    Write-Host "  [WARN] P95 Latency: $('{0:N0}' -f $p95Dur)ms (slow)"
}

Write-Host ""
Write-Host "========================================"
Write-Host "Test completed successfully"
Write-Host "========================================"
Write-Host ""
