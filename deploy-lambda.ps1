#!/usr/bin/env pwsh
<#
.SYNOPSIS
Deploy MCP Server to AWS Lambda with holiday support for getMeetingTime tool

.DESCRIPTION
This script builds the .NET project and deploys it to AWS Lambda using SAM CLI.
It sets up the environment variables for holiday configurations and creates the API Gateway endpoint.

.PARAMETER AWSProfile
AWS profile to use for deployment (default: default)

.PARAMETER AWSRegion
AWS region for deployment (default: us-east-1)

.PARAMETER StackName
CloudFormation stack name (default: mcp-server-stack)

.EXAMPLE
./deploy-lambda.ps1 -AWSProfile myprofile -AWSRegion us-west-2
#>

param(
    [string]$AWSProfile = "default",
    [string]$AWSRegion = "us-east-1",
    [string]$StackName = "mcp-server-stack"
)

$ErrorActionPreference = "Stop"
$script_dir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== MCP Server Lambda Deployment ===" -ForegroundColor Cyan

# Check prerequisites
Write-Host "Checking prerequisites..."
$prereqs = @("dotnet", "sam", "aws")
foreach ($tool in $prereqs) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Error "Required tool not found: $tool. Please install it first."
        exit 1
    }
}

Write-Host "✓ All prerequisites found" -ForegroundColor Green

# Build the project
Write-Host "`nBuilding .NET project..." -ForegroundColor Cyan
Push-Location "$script_dir/src/MCP.Server"
dotnet build -c Release
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed"
    exit 1
}
Write-Host "✓ Build successful" -ForegroundColor Green
Pop-Location

# Build SAM
Write-Host "`nBuilding SAM application..." -ForegroundColor Cyan
Push-Location $script_dir
sam build --region $AWSRegion
if ($LASTEXITCODE -ne 0) {
    Write-Error "SAM build failed"
    exit 1
}
Write-Host "✓ SAM build successful" -ForegroundColor Green
Pop-Location

# Deploy with SAM
Write-Host "`nDeploying to AWS Lambda..." -ForegroundColor Cyan
Push-Location $script_dir
$samArgs = @(
    "deploy",
    "--template-file", "template.yaml",
    "--stack-name", $StackName,
    "--region", $AWSRegion,
    "--capabilities", "CAPABILITY_IAM",
    "--no-confirm-changeset",
    "--no-fail-on-empty-changeset"
)

sam @samArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "SAM deployment failed"
    exit 1
}
Write-Host "✓ Deployment successful" -ForegroundColor Green
Pop-Location

# Get stack outputs
Write-Host "`nRetrieving stack outputs..." -ForegroundColor Cyan
Push-Location $script_dir
$outputs = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $AWSRegion `
    --query "Stacks[0].Outputs" `
    --output json | ConvertFrom-Json

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Stack Name: $StackName" -ForegroundColor Cyan
Write-Host "Region: $AWSRegion" -ForegroundColor Cyan
Write-Host ""

foreach ($output in $outputs) {
    Write-Host "$($output.OutputKey):" -ForegroundColor Yellow
    Write-Host "  $($output.OutputValue)" -ForegroundColor White
    Write-Host ""
}

# Extract API endpoint
$apiEndpoint = ($outputs | Where-Object { $_.OutputKey -eq "McpServerApiEndpoint" }).OutputValue

Write-Host "=== Testing Deployment ===" -ForegroundColor Cyan
Write-Host "Test getMeetingTime:" -ForegroundColor Yellow
Write-Host "curl -X POST '$apiEndpoint/api/tools/getMeetingTime' \" -ForegroundColor White
Write-Host "  -H 'Content-Type: application/json' \" -ForegroundColor White
Write-Host "  -d '{""country1"":""UK"",""country2"":""India"",""preferredTime"":""14:00""}'`n" -ForegroundColor White

Pop-Location

Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Update environment variables in AWS Lambda console or via AWS CLI:" -ForegroundColor Yellow
Write-Host "   aws lambda update-function-configuration `" -ForegroundColor White
Write-Host "     --function-name mcp-server-function `" -ForegroundColor White
Write-Host "     --region $AWSRegion `" -ForegroundColor White
Write-Host "     --profile $AWSProfile `" -ForegroundColor White
Write-Host "     --environment 'Variables={HOLIDAYS_UK=...,HOLIDAYS_US=...}'" -ForegroundColor White
Write-Host ""
Write-Host "2. Or use the provided environment-variables.json file" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Test via the API Gateway endpoint shown above" -ForegroundColor Yellow
