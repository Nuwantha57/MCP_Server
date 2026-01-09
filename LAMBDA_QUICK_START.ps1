#!/usr/bin/env pwsh
<#
.SYNOPSIS
AWS Lambda Deployment Quick Start Guide

.DESCRIPTION
This script demonstrates the 3-step process to deploy MCP Server to AWS Lambda.
Run this after reading the deployment summary for understanding.

.NOTES
Before running:
1. Install prerequisites: dotnet, sam, aws CLI
2. Configure AWS credentials: aws configure --profile myprofile
3. Customize environment-variables.json with your holidays
#>

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          MCP Server → AWS Lambda Deployment Guide             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host ""
Write-Host "STEP 1: Prerequisites" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

Write-Host ""
Write-Host "1a. Verify tools are installed:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    dotnet --version           # Need .NET 8+" -ForegroundColor Gray
Write-Host "    sam --version              # AWS SAM CLI" -ForegroundColor Gray
Write-Host "    aws --version              # AWS CLI v2" -ForegroundColor Gray
Write-Host ""

Write-Host "1b. If not installed, use winget:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    winget install Microsoft.DotNet.SDK.8" -ForegroundColor Gray
Write-Host "    winget install Amazon.SAM" -ForegroundColor Gray
Write-Host "    winget install Amazon.AWSCLI" -ForegroundColor Gray
Write-Host ""

Write-Host "1c. Configure AWS credentials:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    aws configure --profile myprofile" -ForegroundColor Gray
Write-Host ""
Write-Host "    Enter: Access Key ID, Secret Key, Region (us-east-1), Format (json)" -ForegroundColor DarkGray
Write-Host ""

Write-Host "1d. Verify AWS credentials work:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    aws sts get-caller-identity --profile myprofile" -ForegroundColor Gray
Write-Host ""

Write-Host ""
Write-Host "STEP 2: Deploy to AWS Lambda" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

Write-Host ""
Write-Host "2a. Navigate to project directory:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    cd C:\MCP_Server" -ForegroundColor Gray
Write-Host ""

Write-Host "2b. (Optional) Review holiday configuration:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    # Edit file to customize holidays:" -ForegroundColor Gray
Write-Host "    notepad environment-variables.json" -ForegroundColor Gray
Write-Host ""
Write-Host "    # Or use default pre-configured holidays" -ForegroundColor Gray
Write-Host ""

Write-Host "2c. Run deployment script:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    .\deploy-lambda.ps1 -AWSProfile myprofile -AWSRegion us-east-1" -ForegroundColor Gray
Write-Host ""

Write-Host "    This will:" -ForegroundColor DarkGray
Write-Host "    ✓ Build .NET project" -ForegroundColor DarkGray
Write-Host "    ✓ Build SAM application" -ForegroundColor DarkGray
Write-Host "    ✓ Deploy to AWS Lambda" -ForegroundColor DarkGray
Write-Host "    ✓ Display API endpoint URL" -ForegroundColor DarkGray
Write-Host ""

Write-Host ""
Write-Host "STEP 3: Test and Monitor" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

Write-Host ""
Write-Host "3a. Test getMeetingTime (without holiday):" -ForegroundColor Yellow
Write-Host ""
Write-Host '    $url = "https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/api/tools/getMeetingTime"' -ForegroundColor Gray
Write-Host '    $body = @{country1="UK";country2="India";preferredTime="14:00";meetingDate="2026-01-15"} | ConvertTo-Json' -ForegroundColor Gray
Write-Host '    Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json"' -ForegroundColor Gray
Write-Host ""

Write-Host "3b. Test getMeetingTime (with holiday - Christmas):" -ForegroundColor Yellow
Write-Host ""
Write-Host '    $body = @{country1="UK";country2="India";preferredTime="14:00";meetingDate="2026-12-25"} | ConvertTo-Json' -ForegroundColor Gray
Write-Host '    Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json"' -ForegroundColor Gray
Write-Host ""

Write-Host "    Should return:" -ForegroundColor DarkGray
Write-Host "    {" -ForegroundColor DarkGray
Write-Host '      "isHoliday1": true,' -ForegroundColor DarkGray
Write-Host '      "holidayStatus": "⚠️ UK on holiday (Dec 25)",' -ForegroundColor DarkGray
Write-Host '      "nextBusinessDay1": "2026-12-29 (Tue)"' -ForegroundColor DarkGray
Write-Host "    }" -ForegroundColor DarkGray
Write-Host ""

Write-Host "3c. Monitor Lambda logs:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    aws logs tail /aws/lambda/mcp-server-function --follow --region us-east-1" -ForegroundColor Gray
Write-Host ""

Write-Host ""
Write-Host "OPTIONAL STEPS" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

Write-Host ""
Write-Host "Update holidays after deployment (no redeployment needed):" -ForegroundColor Yellow
Write-Host ""
Write-Host "    .\update-lambda-env.ps1 -AWSProfile myprofile -AWSRegion us-east-1" -ForegroundColor Gray
Write-Host ""

Write-Host "Check current configuration:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    aws lambda get-function-configuration --function-name mcp-server-function --region us-east-1" -ForegroundColor Gray
Write-Host ""

Write-Host "Remove everything (cleanup):" -ForegroundColor Yellow
Write-Host ""
Write-Host "    aws cloudformation delete-stack --stack-name mcp-server-stack --region us-east-1" -ForegroundColor Gray
Write-Host ""

Write-Host ""
Write-Host "═" * 66 -ForegroundColor Cyan
Write-Host ""
Write-Host "For detailed documentation, see:" -ForegroundColor Cyan
Write-Host "  • AWS_LAMBDA_DEPLOYMENT_SUMMARY.md" -ForegroundColor White
Write-Host "  • AWS_LAMBDA_SETUP.md" -ForegroundColor White
Write-Host "  • AWS_LAMBDA_DEPLOYMENT_CHECKLIST.md" -ForegroundColor White
Write-Host ""
Write-Host "═" * 66 -ForegroundColor Cyan
