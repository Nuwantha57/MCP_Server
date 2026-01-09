#!/usr/bin/env pwsh
<#
.SYNOPSIS
Deploy MCP Server directly to AWS Lambda (without CloudFormation)

.DESCRIPTION
Creates Lambda function directly using AWS CLI, bypassing CloudFormation IAM requirements.
Assumes the IAM role already exists (must be created by AWS admin).

.PARAMETER FunctionName
Lambda function name (default: mcp-server-function)

.PARAMETER RoleArn
IAM role ARN for Lambda execution (required if not using default)

.PARAMETER Region
AWS region (default: eu-north-1)

.EXAMPLE
./deploy-lambda-direct.ps1 -Region eu-north-1
#>

param(
    [string]$FunctionName = "mcp-server-function",
    [string]$RoleArn = "arn:aws:iam::811146558818:role/mcp-server-lambda-role",
    [string]$Region = "eu-north-1"
)

$ErrorActionPreference = "Stop"

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      MCP Server - Direct Lambda Deployment (No CloudFormation)║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Function Name: $FunctionName"
Write-Host "  IAM Role: $RoleArn"
Write-Host "  Region: $Region"
Write-Host ""

# Check if Lambda package exists
$zipFile = ".aws-sam\build\McpServerFunction\MCP.Server.zip"
if (-not (Test-Path $zipFile)) {
    Write-Error "Lambda package not found: $zipFile"
    Write-Host "Run: sam build --use-container --region $Region" -ForegroundColor Yellow
    exit 1
}

$zipSize = (Get-Item $zipFile).Length / 1MB
Write-Host "✓ Lambda package found ($([math]::Round($zipSize, 2)) MB)" -ForegroundColor Green
Write-Host ""

# Check if function already exists
Write-Host "Checking if Lambda function exists..." -ForegroundColor Cyan
$functionExists = aws lambda get-function --function-name $FunctionName --region $Region 2>$null

if ($functionExists) {
    Write-Host "Function exists. Updating code..." -ForegroundColor Yellow
    
    # Update function code
    aws lambda update-function-code `
        --function-name $FunctionName `
        --zip-file fileb://$zipFile `
        --region $Region | Out-Null
    
    Write-Host "✓ Function code updated" -ForegroundColor Green
} else {
    Write-Host "Function does not exist. Creating new function..." -ForegroundColor Yellow
    
    # Create new function
    aws lambda create-function `
        --function-name $FunctionName `
        --runtime dotnet8 `
        --role $RoleArn `
        --handler "MCP.Server::MCP.Server.LambdaEntrypoint::HandleAsync" `
        --zip-file fileb://$zipFile `
        --timeout 30 `
        --memory-size 512 `
        --region $Region | Out-Null
    
    Write-Host "✓ Lambda function created" -ForegroundColor Green
}

Write-Host ""
Write-Host "Setting environment variables..." -ForegroundColor Cyan

# Read environment variables from file
$envVarsFile = "environment-variables.json"
if (Test-Path $envVarsFile) {
    $envVars = Get-Content $envVarsFile | ConvertFrom-Json
    $envJson = ConvertTo-Json $envVars -Compress
    
    aws lambda update-function-configuration `
        --function-name $FunctionName `
        --environment "Variables=$envJson" `
        --region $Region | Out-Null
    
    Write-Host "✓ Environment variables set" -ForegroundColor Green
    $envVars.PSObject.Properties | ForEach-Object {
        Write-Host "  • $_($_.Name)"
    }
} else {
    Write-Host "⚠ environment-variables.json not found. Skipping env vars." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Creating API Gateway..." -ForegroundColor Cyan

# Create REST API
$apiName = "mcp-server-api"
$apiExists = aws apigateway get-rest-apis --query "items[?name=='$apiName'].id" --output text --region $Region

if ($apiExists) {
    Write-Host "API Gateway already exists: $apiExists" -ForegroundColor Yellow
    $apiId = $apiExists
} else {
    $apiResponse = aws apigateway create-rest-api `
        --name $apiName `
        --description "MCP Server API" `
        --region $Region `
        --output json | ConvertFrom-Json
    
    $apiId = $apiResponse.id
    Write-Host "✓ REST API created: $apiId" -ForegroundColor Green
}

# Get root resource
$rootId = aws apigateway get-resources --rest-api-id $apiId --query "items[0].id" --output text --region $Region

# Create /api resource
$apiResourceId = aws apigateway create-resource `
    --rest-api-id $apiId `
    --parent-id $rootId `
    --path-part api `
    --query "id" --output text --region $Region 2>/dev/null

if (-not $apiResourceId) {
    $apiResourceId = aws apigateway get-resources --rest-api-id $apiId --query "items[?path=='/api'].id" --output text --region $Region
}

# Create /api/tools resource
$toolsResourceId = aws apigateway create-resource `
    --rest-api-id $apiId `
    --parent-id $apiResourceId `
    --path-part tools `
    --query "id" --output text --region $Region 2>/dev/null

if (-not $toolsResourceId) {
    $toolsResourceId = aws apigateway get-resources --rest-api-id $apiId --query "items[?path=='/api/tools'].id" --output text --region $Region
}

# Create /{proxy+} resource
$proxyResourceId = aws apigateway create-resource `
    --rest-api-id $apiId `
    --parent-id $toolsResourceId `
    --path-part "{proxy+}" `
    --query "id" --output text --region $Region 2>/dev/null

if (-not $proxyResourceId) {
    $proxyResourceId = aws apigateway get-resources --rest-api-id $apiId --query "items[?path=='/api/tools/{proxy+}'].id" --output text --region $Region
}

Write-Host "✓ API resources created" -ForegroundColor Green

# Create POST method
aws apigateway put-method `
    --rest-api-id $apiId `
    --resource-id $proxyResourceId `
    --http-method POST `
    --authorization-type NONE `
    --region $Region 2>/dev/null | Out-Null

# Create integration
$lambdaArn = "arn:aws:lambda:${Region}:$(aws sts get-caller-identity --query Account --output text):function:${FunctionName}"

aws apigateway put-integration `
    --rest-api-id $apiId `
    --resource-id $proxyResourceId `
    --http-method POST `
    --type AWS_PROXY `
    --integration-http-method POST `
    --uri "arn:aws:apigateway:${Region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations" `
    --region $Region 2>/dev/null | Out-Null

Write-Host "✓ API Gateway integration created" -ForegroundColor Green

# Deploy API
$stageResponse = aws apigateway create-deployment `
    --rest-api-id $apiId `
    --stage-name prod `
    --stage-description "Production" `
    --region $Region 2>/dev/null | ConvertFrom-Json

$apiEndpoint = "https://${apiId}.execute-api.${Region}.amazonaws.com/prod"

Write-Host "✓ API deployed" -ForegroundColor Green

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host ""
Write-Host "API Endpoint:" -ForegroundColor Yellow
Write-Host "  $apiEndpoint" -ForegroundColor White
Write-Host ""

Write-Host "Test getMeetingTime:" -ForegroundColor Yellow
Write-Host "  curl -X POST '$apiEndpoint/api/tools/getMeetingTime' " -ForegroundColor White
Write-Host "    -H 'Content-Type: application/json' " -ForegroundColor White
Write-Host "    -d '{country1:UK,country2:India}'" -ForegroundColor White
Write-Host ""

Write-Host "Update function code:" -ForegroundColor Yellow
Write-Host "  sam build " -ForegroundColor White
Write-Host "  .\deploy-lambda-direct.ps1" -ForegroundColor White
Write-Host ""

Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  aws logs tail /aws/lambda/mcp-server-function --follow"
