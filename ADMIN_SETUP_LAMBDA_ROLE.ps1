#!/usr/bin/env pwsh
<#
.SYNOPSIS
AWS Administrator Script - Create Lambda Execution Role for MCP Server
This script should be run by someone with IAM admin permissions

.DESCRIPTION
Creates an IAM role that allows the lambda-developer user to deploy and run
the MCP Server Lambda function.
#>

# Create the Lambda execution role
Write-Host "Creating Lambda execution role for MCP Server..." -ForegroundColor Cyan

# Trust policy
$trustPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Principal = @{
                Service = "lambda.amazonaws.com"
            }
            Action = "sts:AssumeRole"
        }
    )
} | ConvertTo-Json -Depth 10

# Create the role
aws iam create-role `
    --role-name mcp-server-lambda-role `
    --assume-role-policy-document $trustPolicy

Write-Host "✓ Role created: mcp-server-lambda-role" -ForegroundColor Green

# Attach basic Lambda execution policy
aws iam attach-role-policy `
    --role-name mcp-server-lambda-role `
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

Write-Host "✓ Attached AWSLambdaBasicExecutionRole policy" -ForegroundColor Green

# Grant user permission to pass this role to Lambda
$inlinePolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Action = "iam:PassRole"
            Resource = "arn:aws:iam::811146558818:role/mcp-server-lambda-role"
        }
    )
} | ConvertTo-Json -Depth 10

aws iam put-user-policy `
    --user-name lambda-developer `
    --policy-name mcp-server-lambda-pass-role `
    --policy-document $inlinePolicy

Write-Host "✓ Granted lambda-developer user PassRole permission" -ForegroundColor Green

Write-Host ""
Write-Host "Setup complete! The lambda-developer user can now:" -ForegroundColor Green
Write-Host "  • Create Lambda functions using this role"
Write-Host "  • Deploy the MCP Server"
Write-Host ""
Write-Host "Next: lambda-developer user should run: deploy-lambda-direct.ps1" -ForegroundColor Yellow
