#!/usr/bin/env powershell
# Update Lambda environment variables with holiday dates
# The holiday dates are stored as JSON in the format: [{"start":"YYYY-MM-DDTHH:MM+TZ:TZ","end":"..."}]

param(
    [string]$Country = "US",
    [string]$StartDate = "2026-12-20",
    [string]$EndDate = "2026-12-22",
    [string]$Timezone = "-05:00"
)

$FunctionName = "mcp-server-function"
$Region = "eu-north-1"

Write-Host "[UPDATE] Country: $Country, Dates: $StartDate to $EndDate, TZ: $Timezone"

# Build the JSON holiday entry
$holidayJson = @{
    start = "$($StartDate)T00:00$Timezone"
    end = "$($EndDate)T23:59$Timezone"
} | ConvertTo-Json -Compress

$holidayKey = "HOLIDAYS_$Country"

Write-Host "[UPDATE] Setting $holidayKey to: $holidayJson"

# Update the environment variable
$updateCmd = "aws lambda update-function-configuration --function-name $FunctionName --region $Region --environment `"Variables={$holidayKey='[$holidayJson]'}`" --output json"

Write-Host "[UPDATE] Running: $updateCmd"

try {
    $result = Invoke-Expression $updateCmd 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[UPDATE] Success!"
        @{
            success = $true
            message = "Holiday dates updated for $Country"
            country = $Country
            startDate = $StartDate
            endDate = $EndDate
            timezone = $Timezone
        } | ConvertTo-Json
    } else {
        Write-Host "[UPDATE] Failed: $result"
        @{
            success = $false
            error = $result
        } | ConvertTo-Json
        exit 1
    }
}
catch {
    Write-Host "[UPDATE] Error: $_"
    @{
        success = $false
        error = $_.Exception.Message
    } | ConvertTo-Json
    exit 1
}
