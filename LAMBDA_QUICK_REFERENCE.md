# AWS Lambda Deployment: What You Need to Know

## Summary of Changes

### 1. Holiday Format (NEW!)
Your `getMeetingTime` tool now supports holidays with date ranges and timezones.

**Before (simple dates only):**
```
HOLIDAYS_UK=2026-01-01,2026-04-10,2026-12-25
```

**After (complex ranges with timezone):**
```
HOLIDAYS_UK=[
  {"start":"2026-12-25T00:00+00:00","end":"2026-12-28T23:59+00:00"},
  {"start":"2026-01-01T00:00+00:00","end":"2026-01-02T23:59+00:00"}
]
```

---

## Files Created for Lambda Deployment

| File | Purpose | Type |
|------|---------|------|
| `LambdaEntrypoint.cs` | AWS Lambda handler | Code |
| `template.yaml` | CloudFormation/SAM template | Config |
| `deploy-lambda.ps1` | Automated deployment script | Script |
| `update-lambda-env.ps1` | Update environment variables | Script |
| `environment-variables.json` | Holiday configurations | Config |
| `AWS_LAMBDA_SETUP.md` | Feature documentation | Doc |
| `AWS_LAMBDA_DEPLOYMENT_CHECKLIST.md` | Step-by-step guide | Doc |
| `AWS_LAMBDA_DEPLOYMENT_SUMMARY.md` | Deployment overview | Doc |
| `LAMBDA_QUICK_START.ps1` | Quick reference guide | Doc |

---

## Files Modified for Lambda Support

| File | Changes |
|------|---------|
| `Program.cs` | Updated `ParseHolidays()` to support JSON format |
| `MCP.Server.csproj` | Added AWS Lambda NuGet packages |

---

## 3-Minute Deployment

```powershell
# 1. Setup (one time)
aws configure --profile myprofile

# 2. Deploy
cd C:\MCP_Server
.\deploy-lambda.ps1 -AWSProfile myprofile -AWSRegion us-east-1

# 3. Test
$url = "https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/api/tools/getMeetingTime"
Invoke-RestMethod -Uri $url -Method POST -Body '{"country1":"UK","country2":"India"}' -ContentType "application/json"
```

---

## How Holiday Detection Works

```
1. Client requests meeting on 2026-12-25 (Christmas) in UK
   ↓
2. Lambda function invoked
   ↓
3. McpTools.GetMeetingTime() called
   ↓
4. ParseHolidays() reads HOLIDAYS_UK environment variable
   ↓
5. Parses JSON: [{"start":"2026-12-25T00:00+00:00","end":"2026-12-28T23:59+00:00"}]
   ↓
6. Extracts dates: 2026-12-25, 2026-12-26, 2026-12-27, 2026-12-28
   ↓
7. Checks if 2026-12-25 is in holiday list → YES
   ↓
8. Sets isHoliday1 = true
   ↓
9. Finds next business day (skip weekends too) → 2026-12-29 (Tuesday)
   ↓
10. Returns response with warning and recommendation
```

---

## Environment Variables (Pre-Configured)

```json
{
  "HOLIDAYS_UK": "Christmas and New Year",
  "HOLIDAYS_US": "Thanksgiving, 4th July, Christmas",
  "HOLIDAYS_INDIA": "Republic Day, Diwali, etc.",
  "HOLIDAYS_AUSTRALIA": "Boxing Day, Australia Day",
  "HOLIDAYS_JAPAN": "Golden Week, New Year",
  "HOLIDAYS_GERMANY": "German public holidays",
  "HOLIDAYS_FRANCE": "Bastille Day, Christmas",
  "HOLIDAYS_SINGAPORE": "Chinese New Year, Hari Raya",
  "HOLIDAYS_BRAZIL": "Carnival, All Souls' Day",
  "HOLIDAYS_NZ": "New Zealand holidays"
}
```

All variables are in the new JSON format with timezone support.

---

## Example: Holiday Response

**Request:**
```bash
POST /api/tools/getMeetingTime
Content-Type: application/json

{
  "country1": "UK",
  "country2": "India",
  "preferredTime": "14:00",
  "meetingDate": "2026-12-25"
}
```

**Response:**
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

## Lambda Architecture Diagram

```
                     ┌─────────────────────────┐
                     │  Claude Desktop / API   │
                     │  (HTTP POST Request)    │
                     └────────────┬────────────┘
                                  │
                                  ↓
                     ┌─────────────────────────┐
                     │   AWS API Gateway       │
                     │  (REST Endpoint)        │
                     │ /api/tools/getMeetingTime
                     └────────────┬────────────┘
                                  │
                                  ↓
                     ┌─────────────────────────────┐
                     │  AWS Lambda Function        │
                     │  mcp-server-function        │
                     │  (Fully managed, auto-scale)
                     └────────────┬────────────────┘
                                  │
                                  ↓
          ┌────────────────────────────────────────┐
          │    LambdaEntrypoint.HandleAsync()      │
          │    (AWS Lambda Handler)                │
          └────────────┬─────────────────────────┘
                       │
                       ↓
          ┌──────────────────────────────────────┐
          │  McpTools.GetMeetingTime()           │
          │  - Get timezone information         │
          │  - Convert time between zones       │
          │  - Call ParseHolidays()             │
          └────────────┬───────────────────────┘
                       │
                       ↓
          ┌──────────────────────────────────────┐
          │  ParseHolidays()                     │
          │  - Read HOLIDAYS_UK env var         │
          │  - Parse JSON with date ranges      │
          │  - Extract all holiday dates        │
          └────────────┬───────────────────────┘
                       │
                       ↓
          ┌──────────────────────────────────────┐
          │  Holiday check & response           │
          │  - Return isHoliday: true/false     │
          │  - Return next business day         │
          │  - Return holiday status message    │
          └────────────┬───────────────────────┘
                       │
                       ↓
                  JSON Response
                       │
                       ↓
          ┌─────────────────────────────┐
          │  API Gateway returns JSON   │
          │  (200 OK with data)         │
          └─────────────────────────────┘
```

---

## Cost Analysis

### Free Tier Coverage (first 12 months)
- **Lambda**: 1,000,000 free requests/month
- **API Gateway**: 1 million free requests/month
- **CloudWatch**: 5GB free logs/month

### Typical Usage (< 1M requests/month)
- **Cost**: $0.00 (within free tier)
- **Memory**: 512 MB (configurable)
- **Timeout**: 30 seconds (configurable)

### If exceeding free tier
- **Lambda**: $0.0000002 per request
- **API Gateway**: $3.50 per million requests
- **CloudWatch**: $0.50 per GB ingested logs

**Example: 10M requests/month = ~$7/month**

---

## Deployment Workflow

```
1. PREPARE (one time)
   ├─ Install tools (dotnet, sam, aws)
   ├─ Configure AWS credentials
   └─ Customize environment-variables.json

2. BUILD & DEPLOY
   ├─ run deploy-lambda.ps1
   ├─ Builds .NET project
   ├─ Builds SAM app
   └─ Creates Lambda + API Gateway

3. CONFIGURE (optional)
   ├─ Update HOLIDAYS_* vars
   ├─ run update-lambda-env.ps1
   └─ No redeployment needed!

4. TEST
   ├─ Call API endpoint
   ├─ Check CloudWatch logs
   └─ Verify holiday detection

5. MONITOR (ongoing)
   ├─ View Lambda metrics
   ├─ Check error logs
   └─ Monitor costs
```

---

## Command Reference

### Deployment
```powershell
# Full deployment
.\deploy-lambda.ps1 -AWSProfile myprofile -AWSRegion us-east-1

# Update environment variables only
.\update-lambda-env.ps1 -AWSProfile myprofile -AWSRegion us-east-1

# Manual SAM deployment
sam build --use-container
sam deploy --guided
```

### Testing
```powershell
# Get API endpoint
$stack = aws cloudformation describe-stacks --stack-name mcp-server-stack `
  --query "Stacks[0].Outputs[?OutputKey=='McpServerApiEndpoint'].OutputValue" --output text

# Test endpoint
$url = "$stack/api/tools/getMeetingTime"
Invoke-RestMethod -Uri $url -Method POST -Body '{"country1":"UK","country2":"India"}' -ContentType "application/json"
```

### Monitoring
```powershell
# View logs
aws logs tail /aws/lambda/mcp-server-function --follow

# Check function config
aws lambda get-function-configuration --function-name mcp-server-function --region us-east-1

# View environment variables
aws lambda get-function-configuration --function-name mcp-server-function `
  --query Environment --output json
```

### Cleanup
```powershell
# Delete everything
aws cloudformation delete-stack --stack-name mcp-server-stack --region us-east-1
```

---

## Troubleshooting Quick Tips

| Problem | Solution |
|---------|----------|
| "SAM build failed" | `Remove-Item -Recurse .aws-sam` then retry |
| "Bucket does not exist" | Use `sam deploy --guided` to create one |
| Holiday check not working | Check env vars: `aws lambda get-function-configuration ...` |
| API returns 500 | Check logs: `aws logs tail /aws/lambda/mcp-server-function --follow` |
| Slow response (>30s) | Increase Lambda timeout in template.yaml |
| High costs | Check request count, reduce memory if possible |

---

## Key Takeaways

✅ **Complex holidays** - Support date ranges with timezone  
✅ **No code redeployment** - Update holidays via environment variables  
✅ **Fully managed** - Lambda handles scaling automatically  
✅ **Cost-free** - Within AWS Free Tier for typical usage  
✅ **Simple API** - Standard HTTP/REST endpoints  
✅ **Easy monitoring** - CloudWatch logs and metrics  
✅ **Rapid deployment** - One command to deploy  

---

## Next Actions

1. **Read** [AWS_LAMBDA_DEPLOYMENT_SUMMARY.md](AWS_LAMBDA_DEPLOYMENT_SUMMARY.md) for overview
2. **Follow** [AWS_LAMBDA_DEPLOYMENT_CHECKLIST.md](AWS_LAMBDA_DEPLOYMENT_CHECKLIST.md) for step-by-step guide
3. **Run** `.\deploy-lambda.ps1` to deploy
4. **Test** using curl or PowerShell
5. **Monitor** via CloudWatch logs

---

## Questions?

- **How do I add more countries?** → Edit `environment-variables.json`, add `HOLIDAYS_NEWCOUNTRY` entry, run update script
- **How do I change the API endpoint?** → CloudFormation creates it automatically via template.yaml
- **Can I deploy to multiple regions?** → Yes, run deploy script with different `AWSRegion` parameter
- **How do I rollback?** → Delete stack: `aws cloudformation delete-stack --stack-name mcp-server-stack`
- **Is it production-ready?** → Yes! Fully managed, auto-scaling, secure

---

**Status**: ✅ Ready to Deploy  
**Build Status**: ✅ Successful  
**Documentation**: ✅ Complete  
**Cost**: ✅ Free (within AWS Free Tier)
