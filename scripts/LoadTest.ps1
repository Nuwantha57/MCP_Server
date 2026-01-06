#Requires -Version 5.1
<#
.SYNOPSIS
    Load testing script for MCP Server - 50 concurrent requests
.DESCRIPTION
    Tests the MCP Server API with 50 concurrent requests across multiple endpoints
.PARAMETER BaseUrl
    The base URL of the API (default: http://localhost:5000)
.PARAMETER Concurrency
    Number of concurrent requests (default: 50)
.PARAMETER ApiKey
    API key for authentication
#>

param(
    [string]$BaseUrl = "http://localhost:5000",
    [int]$Concurrency = 50,
    [string]$ApiKey = "test-api-key-12345"
)

# Configuration
$ErrorActionPreference = "Continue"
$WarningPreference = "SilentlyContinue"

# Test data
$testCases = @(
    @{
        Name = "Echo Tool"
        Method = "POST"
        Endpoint = "/api/tools/echo"
        Body = @{ message = "load-test-message" }
        RequiresAuth = $true
    },
    @{
        Name = "Reverse Tool"
        Method = "POST"
        Endpoint = "/api/tools/reverse"
        Body = @{ text = "loadtest" }
        RequiresAuth = $true
    },
    @{
        Name = "Add Tool"
        Method = "POST"
        Endpoint = "/api/tools/add"
        Body = @{ a = 100; b = 200 }
        RequiresAuth = $true
    },
    @{
        Name = "Get DateTime"
        Method = "POST"
        Endpoint = "/api/tools/getDateTime"
        Body = @{ offsetHours = 0 }
        RequiresAuth = $true
    },
    @{
        Name = "Analyze Text"
        Method = "POST"
        Endpoint = "/api/tools/analyzeText"
        Body = @{ text = "This is a test message for load testing the API" }
        RequiresAuth = $true
    },
    @{
        Name = "Health Check"
        Method = "GET"
        Endpoint = "/health"
        Body = $null
        RequiresAuth = $false
    },
    @{
        Name = "Service Info"
        Method = "GET"
        Endpoint = "/info"
        Body = $null
        RequiresAuth = $false
    }
)

# Results storage
$results = @()
$startTime = Get-Date
$jobResults = @()

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MCP Server Load Test - 50 Concurrent Requests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Base URL: $BaseUrl"
Write-Host "  Concurrency Level: $Concurrency"
Write-Host "  Test Cases: $(($testCases | Measure-Object).Count)"
Write-Host "  Total Requests: $($Concurrency * ($testCases | Measure-Object).Count)"
Write-Host ""
Write-Host "Starting load test at $(Get-Date -Format 'HH:mm:ss.fff')..." -ForegroundColor Green
Write-Host ""

# Create scriptblock for parallel execution
$scriptBlock = {
    param($testCase, $BaseUrl, $ApiKey, $Index)
    
    $url = "$BaseUrl$($testCase.Endpoint)"
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($testCase.RequiresAuth) {
        $headers["x-api-key"] = $ApiKey
    }
    
    $requestStart = Get-Date
    
    try {
        $params = @{
            Uri = $url
            Method = $testCase.Method
            Headers = $headers
            TimeoutSec = 30
            ErrorAction = "Stop"
            UseBasicParsing = $true
        }
        
        if ($testCase.Body -and $testCase.Method -eq "POST") {
            $params.Body = $testCase.Body | ConvertTo-Json
        }
        
        $response = Invoke-WebRequest @params
        $requestEnd = Get-Date
        $duration = ($requestEnd - $requestStart).TotalMilliseconds
        
        @{
            Success = $true
            StatusCode = $response.StatusCode
            Duration = $duration
            TestCase = $testCase.Name
            Endpoint = $testCase.Endpoint
            Index = $Index
            Error = $null
        }
    }
    catch {
        $requestEnd = Get-Date
        $duration = ($requestEnd - $requestStart).TotalMilliseconds
        
        @{
            Success = $false
            StatusCode = $_.Exception.Response.StatusCode -as [int]
            Duration = $duration
            TestCase = $testCase.Name
            Endpoint = $testCase.Endpoint
            Index = $Index
            Error = $_.Exception.Message
        }
    }
}

# Execute concurrent requests
$requestCount = 0
$jobs = @()

# Create 50 concurrent requests
for ($i = 1; $i -le $Concurrency; $i++) {
    # Cycle through test cases
    $testCase = $testCases[($i - 1) % $testCases.Count]
    
    $job = Start-Job -ScriptBlock $scriptBlock -ArgumentList $testCase, $BaseUrl, $ApiKey, $i
    $jobs += $job
    $requestCount++
    
    # Show progress
    if ($i % 5 -eq 0) {
        Write-Host "  Initiated $i concurrent requests..." -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Waiting for all requests to complete..." -ForegroundColor Yellow

# Wait for all jobs to complete and collect results
$completedCount = 0
foreach ($job in $jobs) {
    $result = Receive-Job -Job $job -Wait
    $results += $result
    $completedCount++
    
    if ($completedCount % 10 -eq 0) {
        Write-Host "  Received $completedCount results..." -ForegroundColor Gray
    }
}

# Remove jobs
Get-Job | Remove-Job -Force

$testEnd = Get-Date
$totalDuration = ($testEnd - $startTime).TotalSeconds

# Calculate statistics
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Load Test Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$successCount = ($results | Where-Object { $_.Success -eq $true } | Measure-Object).Count
$failureCount = ($results | Where-Object { $_.Success -eq $false } | Measure-Object).Count
$successRate = if ($results.Count -gt 0) { ($successCount / $results.Count) * 100 } else { 0 }

$durations = $results.Duration
$avgDuration = if ($durations.Count -gt 0) { ($durations | Measure-Object -Average).Average } else { 0 }
$minDuration = if ($durations.Count -gt 0) { ($durations | Measure-Object -Minimum).Minimum } else { 0 }
$maxDuration = if ($durations.Count -gt 0) { ($durations | Measure-Object -Maximum).Maximum } else { 0 }
$medianDuration = if ($durations.Count -gt 0) { [array]::Sort($durations); $durations[[int]($durations.Count / 2)] } else { 0 }

# Calculate percentiles
$p95 = if ($durations.Count -gt 0) { [array]::Sort($durations); $durations[[int]($durations.Count * 0.95)] } else { 0 }
$p99 = if ($durations.Count -gt 0) { $durations[[int]($durations.Count * 0.99)] } else { 0 }

Write-Host "Test Summary:" -ForegroundColor Cyan
Write-Host "  Total Requests: $($results.Count)"
Write-Host "  Successful: $successCount" -ForegroundColor Green
Write-Host "  Failed: $failureCount" -ForegroundColor $(if ($failureCount -gt 0) { "Red" } else { "Green" })
Write-Host "  Success Rate: $('{0:N2}' -f $successRate)%"
Write-Host "  Total Duration: $('{0:N2}' -f $totalDuration)s"
Write-Host "  Requests/sec: $('{0:N2}' -f ($results.Count / $totalDuration))"
Write-Host ""

Write-Host "Response Time Statistics (ms):" -ForegroundColor Cyan
Write-Host "  Min: $('{0:N2}' -f $minDuration)ms"
Write-Host "  Max: $('{0:N2}' -f $maxDuration)ms"
Write-Host "  Average: $('{0:N2}' -f $avgDuration)ms"
Write-Host "  Median: $('{0:N2}' -f $medianDuration)ms"
Write-Host "  P95: $('{0:N2}' -f $p95)ms"
Write-Host "  P99: $('{0:N2}' -f $p99)ms"
Write-Host ""

# Group by endpoint
$byEndpoint = $results | Group-Object -Property Endpoint
Write-Host "Performance by Endpoint:" -ForegroundColor Cyan
foreach ($group in $byEndpoint) {
    $endpointResults = $group.Group
    $endpointSuccess = ($endpointResults | Where-Object { $_.Success -eq $true } | Measure-Object).Count
    $endpointDurations = $endpointResults.Duration
    $endpointAvg = if ($endpointDurations.Count -gt 0) { ($endpointDurations | Measure-Object -Average).Average } else { 0 }
    $endpointSuccessRate = if ($endpointResults.Count -gt 0) { ($endpointSuccess / $endpointResults.Count) * 100 } else { 0 }
    
    Write-Host "  $($group.Name):" -ForegroundColor Yellow
    Write-Host "    Requests: $($group.Count)"
    Write-Host "    Successful: $endpointSuccess"
    Write-Host "    Success Rate: $('{0:N2}' -f $endpointSuccessRate)%"
    Write-Host "    Avg Response: $('{0:N2}' -f $endpointAvg)ms"
}

Write-Host ""

# Group by test case
$byTestCase = $results | Group-Object -Property TestCase
Write-Host "Performance by Test Case:" -ForegroundColor Cyan
foreach ($group in $byTestCase) {
    $caseResults = $group.Group
    $caseSuccess = ($caseResults | Where-Object { $_.Success -eq $true } | Measure-Object).Count
    $caseDurations = $caseResults.Duration
    $caseAvg = if ($caseDurations.Count -gt 0) { ($caseDurations | Measure-Object -Average).Average } else { 0 }
    $caseSuccessRate = if ($caseResults.Count -gt 0) { ($caseSuccess / $caseResults.Count) * 100 } else { 0 }
    
    Write-Host "  $($group.Name):" -ForegroundColor Yellow
    Write-Host "    Requests: $($group.Count)"
    Write-Host "    Successful: $caseSuccess"
    Write-Host "    Success Rate: $('{0:N2}' -f $caseSuccessRate)%"
    Write-Host "    Avg Response: $('{0:N2}' -f $caseAvg)ms"
}

Write-Host ""

# HTTP Status Code Analysis
Write-Host "HTTP Status Codes:" -ForegroundColor Cyan
$statusCodes = $results | Group-Object -Property StatusCode
foreach ($statusGroup in $statusCodes) {
    $statusColor = if ($statusGroup.Name -like "2*") { "Green" } else { "Red" }
    Write-Host "  $($statusGroup.Name): $($statusGroup.Count)" -ForegroundColor $statusColor
}

Write-Host ""

# Error Analysis
$errors = $results | Where-Object { $_.Success -eq $false }
if ($errors.Count -gt 0) {
    Write-Host "Error Analysis:" -ForegroundColor Red
    $errorGroups = $errors | Group-Object -Property Error
    foreach ($errorGroup in $errorGroups) {
        Write-Host "  $($errorGroup.Name): $($errorGroup.Count)" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Throughput Analysis
Write-Host "Throughput Analysis:" -ForegroundColor Cyan
Write-Host "  Peak Concurrency: $Concurrency"
Write-Host "  Requests per Second: $('{0:N2}' -f ($results.Count / $totalDuration))"
Write-Host "  Total Data Points: $($results.Count)"
Write-Host ""

# Performance Assessment
Write-Host "Performance Assessment:" -ForegroundColor Cyan
$assessment = @()
if ($successRate -eq 100) {
    $assessment += "[PASS] 100% Success Rate - Excellent"
} elseif ($successRate -ge 95) {
    $assessment += "[PASS] $successRate% Success Rate - Good"
} else {
    $assessment += "[FAIL] $successRate% Success Rate - Poor"
}

if ($avgDuration -lt 100) {
    $assessment += "[PASS] Average Response Time < 100ms - Excellent"
} elseif ($avgDuration -lt 500) {
    $assessment += "[WARN] Average Response Time $('{0:N2}' -f $avgDuration)ms - Acceptable"
} else {
    $assessment += "[FAIL] Average Response Time $('{0:N2}' -f $avgDuration)ms - Slow"
}

if ($p95 -lt 500) {
    $assessment += "[PASS] P95 Response Time < 500ms - Excellent"
} elseif ($p95 -lt 1000) {
    $assessment += "[WARN] P95 Response Time $('{0:N2}' -f $p95)ms - Acceptable"
} else {
    $assessment += "[FAIL] P95 Response Time $('{0:N2}' -f $p95)ms - Slow"
}

foreach ($item in $assessment) {
    if ($item -like "[PASS]*") {
        Write-Host "  $item" -ForegroundColor Green
    } elseif ($item -like "[WARN]*") {
        Write-Host "  $item" -ForegroundColor Yellow
    } else {
        Write-Host "  $item" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Export results to file
$reportPath = "c:\MCP_Server\docs\LOAD_TEST_RESULTS.txt"
$report = @"
========================================
MCP Server Load Test Report
========================================
Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Base URL: $BaseUrl
Concurrency Level: $Concurrency
Total Requests: $($results.Count)
Test Duration: $('{0:N2}' -f $totalDuration)s

========================================
SUMMARY
========================================
Successful Requests: $successCount
Failed Requests: $failureCount
Success Rate: $('{0:N2}' -f $successRate)%
Requests per Second: $('{0:N2}' -f ($results.Count / $totalDuration))

========================================
RESPONSE TIME STATISTICS (ms)
========================================
Minimum: $('{0:N2}' -f $minDuration)
Maximum: $('{0:N2}' -f $maxDuration)
Average: $('{0:N2}' -f $avgDuration)
Median: $('{0:N2}' -f $medianDuration)
P95 (95th Percentile): $('{0:N2}' -f $p95)
P99 (99th Percentile): $('{0:N2}' -f $p99)

========================================
PERFORMANCE BY ENDPOINT
========================================
"@

foreach ($group in $byEndpoint) {
    $endpointResults = $group.Group
    $endpointSuccess = ($endpointResults | Where-Object { $_.Success -eq $true } | Measure-Object).Count
    $endpointDurations = $endpointResults.Duration
    $endpointAvg = if ($endpointDurations.Count -gt 0) { ($endpointDurations | Measure-Object -Average).Average } else { 0 }
    $endpointSuccessRate = if ($endpointResults.Count -gt 0) { ($endpointSuccess / $endpointResults.Count) * 100 } else { 0 }
    
    $report += @"

Endpoint: $($group.Name)
Requests: $($group.Count)
Successful: $endpointSuccess
Success Rate: $('{0:N2}' -f $endpointSuccessRate)%
Average Response Time: $('{0:N2}' -f $endpointAvg)ms
"@
}

$report += @"

========================================
PERFORMANCE BY TEST CASE
========================================
"@

foreach ($group in $byTestCase) {
    $caseResults = $group.Group
    $caseSuccess = ($caseResults | Where-Object { $_.Success -eq $true } | Measure-Object).Count
    $caseDurations = $caseResults.Duration
    $caseAvg = if ($caseDurations.Count -gt 0) { ($caseDurations | Measure-Object -Average).Average } else { 0 }
    $caseSuccessRate = if ($caseResults.Count -gt 0) { ($caseSuccess / $caseResults.Count) * 100 } else { 0 }
    
    $report += @"

Test Case: $($group.Name)
Requests: $($group.Count)
Successful: $caseSuccess
Success Rate: $('{0:N2}' -f $caseSuccessRate)%
Average Response Time: $('{0:N2}' -f $caseAvg)ms
"@
}

$report += @"

========================================
HTTP STATUS CODES
========================================
"@

foreach ($statusGroup in $statusCodes) {
    $report += "`n$($statusGroup.Name): $($statusGroup.Count)"
}

$report += @"

========================================
PERFORMANCE ASSESSMENT
========================================
"@

foreach ($item in $assessment) {
    $report += "`n$item"
}

$report += @"

========================================
RECOMMENDATIONS
========================================
"@

if ($successRate -lt 100) {
    $report += "`n- Investigate failed requests: $failureCount failures detected"
}

if ($avgDuration -gt 500) {
    $report += "`n- Consider optimizing slow endpoints (avg: $('{0:N2}' -f $avgDuration)ms)"
}

if ($p95 -gt 1000) {
    $report += "`n- P95 response time is high ($('{0:N2}' -f $p95)ms) - check for bottlenecks"
}

if ($successRate -eq 100 -and $avgDuration -lt 100 -and $p95 -lt 500) {
    $report += "`n- Excellent performance! Consider testing with higher concurrency"
}

$report += @"

========================================
END OF REPORT
========================================
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@

$report | Out-File -FilePath $reportPath -Encoding UTF8 -Force

Write-Host ""
Write-Host "Report saved to: $reportPath" -ForegroundColor Green
