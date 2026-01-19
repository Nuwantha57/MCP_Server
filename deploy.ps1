# Deploy MCP Server to AWS Lambda
# Prerequisites: AWS CLI configured with credentials

param(
    [string]$Region = "eu-north-1",
    [string]$FunctionName = "mcp-server-function"
)

Write-Host "Deploying MCP Server to AWS Lambda..." -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "Function: $FunctionName`n" -ForegroundColor Yellow

# Build the .NET project
Write-Host "Building .NET project..." -ForegroundColor Green
dotnet build src/MCP.Server/MCP.Server.csproj -c Release

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Publish for Lambda
Write-Host "Publishing for Lambda runtime..." -ForegroundColor Green
dotnet publish src/MCP.Server/MCP.Server.csproj -c Release -o publish

# Package for Lambda
Write-Host "Creating deployment package..." -ForegroundColor Green
Compress-Archive -Path publish/* -DestinationPath lambda-package.zip -Force

# Deploy to Lambda
Write-Host "Deploying to AWS Lambda..." -ForegroundColor Green
aws lambda update-function-code `
    --function-name $FunctionName `
    --zip-file fileb://lambda-package.zip `
    --region $Region

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    Write-Host "Function: $FunctionName" -ForegroundColor Cyan
    Write-Host "Region: $Region`n" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

# Cleanup
Remove-Item lambda-package.zip -Force -ErrorAction SilentlyContinue
Remove-Item publish -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Deployment complete!" -ForegroundColor Green
