# AWS Lambda Deployment Checklist

## Complete Guide: Deploy MCP Server to AWS Lambda with Holiday Support

---

## Part 1: Prerequisites & Preparation

### Step 1: Install Required Tools
```powershell
# Check if already installed
dotnet --version
sam --version
aws --version

# Install if missing
winget install Microsoft.DotNet.SDK.8   # or latest
winget install Amazon.SAM
winget install Amazon.AWSCLI
```

### Step 2: Configure AWS Credentials
```powershell
# Set up AWS credentials
aws configure --profile myprofile

# When prompted, enter:
# - AWS Access Key ID: [your access key]
# - AWS Secret Access Key: [your secret key]
# - Default region: us-east-1 (or your preferred region)
# - Default output format: json

# Verify configuration
aws sts get-caller-identity --profile myprofile
```

### Step 3: Prepare Holiday Configuration

Edit `environment-variables.json` with your holidays:

```json
{
  "HOLIDAYS_UK": "[{\"start\":\"2026-12-25T00:00+00:00\",\"end\":\"2026-12-28T23:59+00:00\"}]",
  "HOLIDAYS_US": "[{\"start\":\"2026-12-25T00:00-05:00\",\"end\":\"2026-12-26T23:59-05:00\"}]",
  "HOLIDAYS_INDIA": "[{\"start\":\"2026-10-02T00:00+05:30\",\"end\":\"2026-10-02T23:59+05:30\"}]"
}
```

**Format:**
- Complex holidays: `[{"start":"YYYY-MM-DDTHH:MM±HH:MM","end":"YYYY-MM-DDTHH:MM±HH:MM"}]`
- Simple dates: `2026-01-01,2026-12-25` (comma-separated)

---

## Part 2: Build & Deploy

### Step 4: Build .NET Project
```powershell
cd C:\MCP_Server
cd src\MCP.Server
dotnet build -c Release

# Verify successful build
if ($LASTEXITCODE -eq 0) { Write-Host "✓ Build successful" -ForegroundColor Green }
```

### Step 5: Deploy Using SAM

#### Option A: Automatic Deployment (Recommended)
```powershell
cd C:\MCP_Server
.\deploy-lambda.ps1 -AWSProfile myprofile -AWSRegion us-east-1
```

This script will:
1. Build the .NET project
2. Build the SAM application
3. Deploy to AWS Lambda
4. Display API endpoint URLs

#### Option B: Manual SAM Deployment
```powershell
cd C:\MCP_Server

# Build SAM
sam build --use-container --region us-east-1

# Deploy (first time - guided)
sam deploy --guided

# Or deploy without guided prompt (subsequent deployments)
sam deploy --region us-east-1
```

**For guided deployment, answer:**
- Stack Name: `mcp-server-stack`
- Region: `us-east-1` (or your region)
- Confirm changes before deploy: `y`
- Create IAM role: `y`
- Save parameters: `y`

### Step 6: Verify Deployment

```powershell
# List CloudFormation stacks
aws cloudformation describe-stacks --stack-name mcp-server-stack --region us-east-1 --query "Stacks[0].Outputs"

# Or check Lambda function
aws lambda get-function --function-name mcp-server-function --region us-east-1
```

---

## Part 3: Configure Holiday Environment Variables

### Step 7: Update Environment Variables

#### Option A: Using Provided Script (Recommended)
```powershell
cd C:\MCP_Server
.\update-lambda-env.ps1 -AWSProfile myprofile -AWSRegion us-east-1

# This reads environment-variables.json and updates Lambda function
```

#### Option B: Manual AWS CLI Update
```powershell
$envVars = Get-Content environment-variables.json | ConvertFrom-Json
$envJson = ConvertTo-Json $envVars -Compress

aws lambda update-function-configuration `
  --function-name mcp-server-function `
  --region us-east-1 `
  --environment "Variables=$envJson"
```

#### Option C: AWS Lambda Console
1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda/home)
2. Select `mcp-server-function`
3. Go to **Configuration** → **Environment variables**
4. Add/Edit each HOLIDAYS_* variable
5. Save

### Step 8: Verify Environment Variables
```powershell
# View current environment
aws lambda get-function-configuration `
  --function-name mcp-server-function `
  --region us-east-1 `
  --query Environment
```

---

## Part 4: Testing

### Step 9: Test getMeetingTime Tool

#### Get API Endpoint
```powershell
$stack = aws cloudformation describe-stacks `
  --stack-name mcp-server-stack `
  --region us-east-1 `
  --query "Stacks[0].Outputs[?OutputKey=='McpServerApiEndpoint'].OutputValue" `
  --output text

Write-Host "API Endpoint: $stack"
```

#### Test Without Holiday (Success Case)
```powershell
$url = "$API_ENDPOINT/api/tools/getMeetingTime"

$body = @{
    country1 = "UK"
    country2 = "India"
    preferredTime = "14:00"
    meetingDate = "2026-01-15"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json" | ConvertTo-Json
```

**Expected Response:**
```json
{
  "country1": "UK",
  "country2": "India",
  "timezone1": "Europe/London",
  "timezone2": "Asia/Kolkata",
  "time1": "14:00:00",
  "time2": "19:30:00",
  "date1": "2026-01-15 (Thu)",
  "date2": "2026-01-15 (Thu)",
  "isHoliday1": false,
  "isHoliday2": false,
  "holidayStatus": "",
  "nextBusinessDay1": "2026-01-15 (Thu)",
  "nextBusinessDay2": "2026-01-15 (Thu)",
  "message": "When it's 14:00 in UK, it's 19:30 in India"
}
```

#### Test With Holiday (Warning Case)
```powershell
$body = @{
    country1 = "UK"
    country2 = "India"
    preferredTime = "14:00"
    meetingDate = "2026-12-25"  # Christmas
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json" | ConvertTo-Json
```

**Expected Response (with warning):**
```json
{
  "country1": "UK",
  "country2": "India",
  "isHoliday1": true,
  "holidayStatus": "⚠️ UK on holiday (Dec 25)",
  "nextBusinessDay1": "2026-12-29 (Tue)",
  "message": "When it's 14:00 in UK, it's 19:30 in India. ⚠️ UK on holiday (Dec 25)"
}
```

### Step 10: Test Other Tools
```powershell
# Test echo
Invoke-RestMethod -Uri "$API_ENDPOINT/api/tools/echo" `
  -Method POST `
  -Body '{"message":"hello"}' `
  -ContentType "application/json"

# Test reverse
Invoke-RestMethod -Uri "$API_ENDPOINT/api/tools/reverse" `
  -Method POST `
  -Body '{"text":"hello"}' `
  -ContentType "application/json"

# Test add
Invoke-RestMethod -Uri "$API_ENDPOINT/api/tools/add" `
  -Method POST `
  -Body '{"a":5,"b":3}' `
  -ContentType "application/json"

# Test health
Invoke-RestMethod -Uri "$API_ENDPOINT/health" -Method GET
```

---

## Part 5: Integration & Monitoring

### Step 11: Update Node.js Bridge (Optional)

If using Claude Desktop with the Node.js bridge:

```javascript
// In server.js
const MCP_SERVER_URL = 'https://xxxxx.execute-api.us-east-1.amazonaws.com/prod';
const MCP_API_KEY = 'dev-api-key-12345'; // Optional - not used by Lambda in this setup
```

### Step 12: Monitor Logs

```powershell
# View recent logs
aws logs tail /aws/lambda/mcp-server-function --follow --region us-east-1

# View specific log group
aws logs describe-log-streams `
  --log-group-name /aws/lambda/mcp-server-function `
  --region us-east-1

# Get last 50 log lines
aws logs tail /aws/lambda/mcp-server-function --max-items 50 --region us-east-1
```

### Step 13: View CloudWatch Metrics

```powershell
# Get Lambda metrics
aws cloudwatch get-metric-statistics `
  --namespace AWS/Lambda `
  --metric-name Invocations `
  --dimensions Name=FunctionName,Value=mcp-server-function `
  --start-time (Get-Date).AddDays(-1).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') `
  --end-time (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') `
  --period 3600 `
  --statistics Sum `
  --region us-east-1
```

---

## Part 6: Troubleshooting

### Issue: Deployment fails with "SAM build failed"
**Solution:**
```powershell
Remove-Item -Recurse -Force .aws-sam
sam build --use-container --region us-east-1
sam deploy
```

### Issue: "The specified bucket does not exist"
**Solution:**
```powershell
# Use guided deployment to create S3 bucket
sam deploy --guided

# Or manually create bucket
aws s3 mb s3://mcp-server-artifacts-$(Get-Random) --region us-east-1
```

### Issue: Holiday check not working
**Solution:**
```powershell
# 1. Verify environment variables are set
aws lambda get-function-configuration `
  --function-name mcp-server-function `
  --region us-east-1 `
  --query Environment

# 2. Check log output
aws logs tail /aws/lambda/mcp-server-function --follow

# 3. Verify JSON format is valid
# Use online JSON validator to test environment-variables.json
```

### Issue: API returns 500 error
**Solution:**
```powershell
# Check CloudWatch logs for detailed error
aws logs tail /aws/lambda/mcp-server-function --follow --region us-east-1

# Test locally first
cd C:\MCP_Server\src\MCP.Server
dotnet run

# Curl from another terminal
curl -X POST "http://localhost:5000/api/tools/getMeetingTime" `
  -H "Content-Type: application/json" `
  -d '{"country1":"UK","country2":"India"}'
```

### Issue: API Gateway timeout (>30 seconds)
**Solution:**
1. Check if Lambda timeout is configured (default 30s)
```powershell
aws lambda get-function-configuration `
  --function-name mcp-server-function `
  --query Timeout
```

2. Increase timeout in template.yaml:
```yaml
Globals:
  Function:
    Timeout: 60
```

3. Redeploy

---

## Part 7: Cost Optimization

### Check Monthly Costs
```powershell
# Use AWS Cost Explorer
# https://console.aws.amazon.com/cost-management/home?region=us-east-1#/custom
```

### Free Tier Usage
- Lambda: 1,000,000 free requests/month
- API Gateway: 1 million free requests/month
- CloudWatch Logs: 5GB free per month

**For < 1M requests/month: Typically FREE under AWS Free Tier**

### Cost-Saving Tips
1. Use S3 bucket for deployment artifacts (minimal cost)
2. Set appropriate Lambda memory (128 MB minimum)
3. Monitor unused functions
4. Use Lambda Insights for optimization

---

## Part 8: Cleanup

### Remove Everything (If Needed)
```powershell
# Delete CloudFormation stack (removes Lambda, API Gateway, etc.)
aws cloudformation delete-stack --stack-name mcp-server-stack --region us-east-1

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name mcp-server-stack --region us-east-1 --region us-east-1

# Verify deletion
aws cloudformation describe-stacks --stack-name mcp-server-stack --region us-east-1
```

---

## Quick Reference Commands

```powershell
# Deploy
cd C:\MCP_Server
.\deploy-lambda.ps1 -AWSProfile myprofile -AWSRegion us-east-1

# Update environment variables
.\update-lambda-env.ps1 -AWSProfile myprofile -AWSRegion us-east-1

# View logs
aws logs tail /aws/lambda/mcp-server-function --follow

# Test endpoint
$url = "https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/api/tools/getMeetingTime"
Invoke-RestMethod -Uri $url -Method POST -Body '{"country1":"UK","country2":"India"}' -ContentType "application/json"

# Check configuration
aws lambda get-function-configuration --function-name mcp-server-function --region us-east-1

# Delete stack
aws cloudformation delete-stack --stack-name mcp-server-stack --region us-east-1
```

---

## Success Indicators

You've successfully deployed when:
- ✅ CloudFormation stack shows **CREATE_COMPLETE** status
- ✅ Lambda function appears in AWS Lambda console
- ✅ API Gateway endpoint is accessible
- ✅ CloudWatch Logs show function invocations
- ✅ getMeetingTime returns holiday status correctly
- ✅ No 500 errors in responses

---

## Next Steps

1. **Integrate with Claude Desktop** - Update server.js to use Lambda API endpoint
2. **Add more countries** - Update environment-variables.json with your regions
3. **Set up monitoring** - Create CloudWatch alarms for errors
4. **Enable custom domain** - Use API Gateway custom domain for friendlier URLs
5. **Scale globally** - Deploy to multiple regions using AWS Lambda@Edge

---

## Support & Resources

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
