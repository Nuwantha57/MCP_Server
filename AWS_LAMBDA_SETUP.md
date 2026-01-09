# AWS Lambda Deployment Guide for MCP Server with Holiday Support

## Overview
This guide explains how to deploy the MCP Server to AWS Lambda with holiday support for the `getMeetingTime` tool. The deployment includes:
- Automatic holiday checking (prevents scheduling meetings on holidays)
- Support for complex holiday date ranges with timezones
- REST API through API Gateway
- Easy environment variable management

---

## What's New

### 1. **Enhanced Holiday Support** 
The `getMeetingTime` tool now supports two holiday formats:

**Simple Format (comma-separated dates):**
```
HOLIDAYS_UK=2026-01-01,2026-04-10,2026-12-25
```

**Complex Format (JSON with time ranges):**
```json
HOLIDAYS_UK=[{"start":"2026-12-25T00:00+00:00","end":"2026-12-28T23:59+00:00"},{"start":"2026-01-01T00:00+00:00","end":"2026-01-02T23:59+00:00"}]
```

The second format allows you to define holiday periods with exact start/end times and timezone support.

### 2. **Lambda Entrypoint**
- File: `src/MCP.Server/LambdaEntrypoint.cs`
- Provides AWS Lambda HTTP handler compatibility
- Converts API Gateway events to ASP.NET Core HttpContext
- All existing tools work seamlessly

### 3. **SAM Template**
- File: `template.yaml`
- Defines Lambda function, API Gateway, CloudWatch logging
- Pre-configured with sample holiday variables
- Easily customizable for your regions

---

## Files Created/Modified

### New Files:
1. **LambdaEntrypoint.cs** - AWS Lambda handler
2. **template.yaml** - SAM CloudFormation template
3. **deploy-lambda.ps1** - Deployment automation script
4. **update-lambda-env.ps1** - Environment variable update script
5. **environment-variables.json** - Holiday configurations
6. **AWS_LAMBDA_SETUP.md** - This guide

### Modified Files:
1. **Program.cs** - Enhanced `ParseHolidays()` to support JSON format

---

## Prerequisites

Before deploying, ensure you have:

```powershell
# Check installations
dotnet --version          # Need .NET 8 or later
sam --version            # AWS SAM CLI
aws --version            # AWS CLI v2
```

**Installation commands:**
```powershell
# Install AWS SAM CLI
winget install Amazon.SAM

# Install AWS CLI
winget install Amazon.AWSCLI

# Verify AWS credentials
aws sts get-caller-identity --profile <your-profile>
```

---

## Quick Start: Deploy in 3 Steps

### Step 1: Configure AWS Credentials
```powershell
aws configure --profile myprofile
# Enter: Access Key ID, Secret Access Key, Region (e.g., us-east-1), Output format (json)
```

### Step 2: Deploy to Lambda
```powershell
cd C:\MCP_Server
.\deploy-lambda.ps1 -AWSProfile myprofile -AWSRegion us-east-1
```

This script will:
- Build the .NET project
- Build the SAM application
- Deploy to AWS Lambda
- Output API endpoint URLs

### Step 3: Update Holiday Variables
```powershell
.\update-lambda-env.ps1 -AWSProfile myprofile -AWSRegion us-east-1
```

This script reads `environment-variables.json` and updates the Lambda function.

---

## Testing

### Test via curl (after deployment)
```bash
# Get API endpoint from deploy output
API_URL="https://xxxxx.execute-api.us-east-1.amazonaws.com/prod"

# Test getMeetingTime
curl -X POST "$API_URL/api/tools/getMeetingTime" \
  -H "Content-Type: application/json" \
  -d '{
    "country1": "UK",
    "country2": "India",
    "preferredTime": "14:00",
    "meetingDate": "2026-12-25"
  }'
```

### Expected Response (with holiday warning):
```json
{
  "country1": "UK",
  "country2": "India",
  "timezone1": "Europe/London",
  "timezone2": "Asia/Kolkata",
  "time1": "14:00:00",
  "time2": "19:30:00",
  "date1": "2026-12-25 (Fri)",
  "date2": "2026-12-25 (Fri)",
  "isHoliday1": true,
  "isHoliday2": false,
  "holidayStatus": "⚠️ UK on holiday (Dec 25)",
  "nextBusinessDay1": "2026-12-29 (Tue)",
  "nextBusinessDay2": "2026-12-25 (Fri)",
  "message": "When it's 14:00 in UK, it's 19:30 in India. ⚠️ UK on holiday (Dec 25)"
}
```

---

## Environment Variables Format

### In template.yaml (SAM)
Pre-configured examples:
```yaml
Environment:
  Variables:
    HOLIDAYS_UK: '[{"start":"2026-12-25T00:00+00:00","end":"2026-12-28T23:59+00:00"}]'
    HOLIDAYS_US: '[{"start":"2026-12-25T00:00-05:00","end":"2026-12-26T23:59-05:00"}]'
```

### In environment-variables.json
```json
{
  "HOLIDAYS_UK": "[{\"start\":\"2026-12-25T00:00+00:00\",\"end\":\"2026-12-28T23:59+00:00\"}]",
  "HOLIDAYS_US": "[{\"start\":\"2026-12-25T00:00-05:00\",\"end\":\"2026-12-26T23:59-05:00\"}]"
}
```

### In AWS Lambda Console
1. Go to Lambda > Functions > `mcp-server-function`
2. Configuration > Environment variables
3. Add/Edit variables directly in the UI

### Via AWS CLI
```powershell
aws lambda update-function-configuration `
  --function-name mcp-server-function `
  --region us-east-1 `
  --environment 'Variables={HOLIDAYS_UK="[{\"start\":\"2026-12-25T00:00+00:00\",\"end\":\"2026-12-28T23:59+00:00\"}]"}'
```

---

## Adding More Countries/Holidays

### Option 1: Update template.yaml (before deployment)
```yaml
Environment:
  Variables:
    HOLIDAYS_FRANCE: '[{"start":"2026-07-14T00:00+01:00","end":"2026-07-14T23:59+01:00"}]'
    HOLIDAYS_MEXICO: '[{"start":"2026-12-25T00:00-06:00","end":"2026-01-01T23:59-06:00"}]'
```

### Option 2: Update environment-variables.json and run update script
```json
{
  "HOLIDAYS_FRANCE": "[{\"start\":\"2026-07-14T00:00+01:00\",\"end\":\"2026-07-14T23:59+01:00\"}]",
  "HOLIDAYS_MEXICO": "[{\"start\":\"2026-12-25T00:00-06:00\",\"end\":\"2026-01-01T23:59-06:00\"}]"
}
```

Then run:
```powershell
.\update-lambda-env.ps1
```

### Option 3: AWS Lambda Console
1. Select function → Configuration → Environment variables
2. Edit → Add new variable
3. Key: `HOLIDAYS_NEWCOUNTRY`, Value: `[{...}]`
4. Save and test

---

## Holiday Configuration Examples

### UK Christmas Period (Dec 25-28)
```json
{
  "start": "2026-12-25T00:00+00:00",
  "end": "2026-12-28T23:59+00:00"
}
```

### US Thanksgiving (Nov 26-27, 2026)
```json
{
  "start": "2026-11-26T00:00-05:00",
  "end": "2026-11-27T23:59-05:00"
}
```

### India Diwali (Oct 29-30, 2026 with IST timezone)
```json
{
  "start": "2026-10-29T00:00+05:30",
  "end": "2026-10-30T23:59+05:30"
}
```

### Australia New Year (Jan 1-2, 2026 with AEDT timezone)
```json
{
  "start": "2026-01-01T00:00+11:00",
  "end": "2026-01-02T23:59+11:00"
}
```

---

## Troubleshooting

### Issue: "SAM build failed"
**Solution:** 
```powershell
# Clear build cache
Remove-Item -Recurse -Force .aws-sam
sam build --use-container
```

### Issue: "The specified bucket does not exist"
**Solution:** SAM needs an S3 bucket for deployment
```powershell
sam deploy --guided  # Follow the prompts to create bucket
```

### Issue: "Access Denied" when deploying
**Solution:** Check AWS credentials and permissions
```powershell
aws sts get-caller-identity
# Ensure your user has Lambda, API Gateway, and IAM permissions
```

### Issue: Lambda returns 500 error
**Solution:** Check CloudWatch logs
```powershell
aws logs tail /aws/lambda/mcp-server-function --follow --region us-east-1
```

### Issue: Holiday check not working
**Solution:** Verify environment variables
```powershell
aws lambda get-function-configuration --function-name mcp-server-function --region us-east-1 --query Environment
```

---

## Architecture

```
API Gateway (HTTP)
        ↓
   Lambda Function
        ↓
   LambdaEntrypoint.cs (Handler)
        ↓
   ASP.NET Core Pipeline
        ↓
   Route: /api/tools/getMeetingTime
        ↓
   McpTools.GetMeetingTime()
        ↓
   ParseHolidays() → Reads HOLIDAYS_* env vars
        ↓
   Returns JSON with holiday status
```

---

## Cost Estimation

**AWS Lambda Free Tier:**
- 1,000,000 free requests/month
- 400,000 GB-seconds free/month
- No charges for first 1 year under free tier

**Typical usage costs (after free tier):**
- API Gateway: $3.50 per million requests
- Lambda: $0.0000002 per request (most requests < 100ms)
- CloudWatch Logs: $0.50 per GB ingested

**For < 1M monthly requests: < $1/month**

---

## Next Steps

1. **Customize holidays** - Edit `environment-variables.json` with your required holidays
2. **Test the API** - Use the provided curl examples
3. **Integrate with Claude Desktop** - Update `server.js` to point to Lambda API endpoint
4. **Monitor** - View CloudWatch logs for debugging
5. **Scale** - Lambda auto-scales based on traffic

---

## Support

For issues or questions:
- Check CloudWatch logs: `aws logs tail /aws/lambda/mcp-server-function --follow`
- Review AWS SAM documentation: https://aws.amazon.com/serverless/sam/
- Test locally before deploying using the existing server setup

---

## Summary of Commands

```powershell
# Initial setup
aws configure --profile myprofile

# Deploy
cd C:\MCP_Server
.\deploy-lambda.ps1 -AWSProfile myprofile -AWSRegion us-east-1

# Update environment variables
.\update-lambda-env.ps1 -AWSProfile myprofile -AWSRegion us-east-1

# Monitor logs
aws logs tail /aws/lambda/mcp-server-function --follow

# Remove deployment
aws cloudformation delete-stack --stack-name mcp-server-stack
```
