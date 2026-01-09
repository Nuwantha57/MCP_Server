#!/usr/bin/env pwsh
<#
.SYNOPSIS
Update AWS Lambda function environment variables with holiday configurations

.DESCRIPTION
Reads environment-variables.json and updates the Lambda function with the holiday configurations.
This allows the getMeetingTime tool to avoid scheduling meetings on holidays.

.PARAMETER FunctionName
Name of the Lambda function (default: mcp-server-function)

.PARAMETER AWSProfile
AWS profile to use (default: default)

.PARAMETER AWSRegion
AWS region (default: us-east-1)

.PARAMETER VariablesFile
Path to environment-variables.json (default: ./environment-variables.json)

.EXAMPLE
./update-lambda-env.ps1 -FunctionName mcp-server-function -AWSRegion us-west-2
#>

param(
    [string]$FunctionName = "mcp-server-function",
    [string]$AWSProfile = "default",
    [string]$AWSRegion = "us-east-1",
    [string]$VariablesFile = "./environment-variables.json"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Update Lambda Environment Variables ===" -ForegroundColor Cyan

# Check if file exists
if (-not (Test-Path $VariablesFile)) {
    Write-Error "Variables file not found: $VariablesFile"
    exit 1
}

# Load variables
Write-Host "Loading environment variables from $VariablesFile..." -ForegroundColor Yellow
$envVars = Get-Content $VariablesFile | ConvertFrom-Json

# Build environment string for AWS CLI
$envDict = @{}
foreach ($prop in $envVars.PSObject.Properties) {
    $envDict[$prop.Name] = $prop.Value
}

Write-Host "Found $($envDict.Count) environment variables" -ForegroundColor Green

# Update Lambda function
Write-Host "`nUpdating Lambda function: $FunctionName" -ForegroundColor Cyan

$envJson = ConvertTo-Json $envDict -Compress
Write-Host "Sending update command..." -ForegroundColor Yellow

aws lambda update-function-configuration `
    --function-name $FunctionName `
    --region $AWSRegion `
    --profile $AWSProfile `
    --environment "Variables=$envJson" | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Environment variables updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Updated variables:" -ForegroundColor Cyan
    $envDict.Keys | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Note: Lambda may take a few seconds to apply the changes." -ForegroundColor Yellow
} else {
    Write-Error "Failed to update Lambda function"
    exit 1
}

# Optional: Test the function
Write-Host "`nTo test the function, use:" -ForegroundColor Cyan
Write-Host "aws lambda invoke --function-name $FunctionName --region $AWSRegion response.json" -ForegroundColor White
