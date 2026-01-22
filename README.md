# MCP Server - AWS Lambda Holiday Management via Claude Desktop

---

## Repository Link: https://github.com/Nuwantha57/MCP_Server

## Overview

MCP Server is a **serverless AWS Lambda function** that enables **dynamic holiday management** through Claude Desktop. Simply type natural language commands in Claude, and the holidays are updated instantly in AWS Lambda environment variables - **no code changes or redeployment required**.

### What You Can Do

**Single Country Update:**

```
Claude Desktop Input: "Update US holidays to December 23-27, 2026 with timezone -05:00"
Result: US holiday environment variable updated in Lambda
```

**Multiple Countries at Once:**

```
Claude Desktop Input: "Update US holidays to December 23-27, 2026 with timezone -05:00 
and Update UK holidays to December 20-25, 2026 with timezone +00:00"
Result: Both US and UK holidays updated simultaneously
```

**Append New Holiday:**

```
Claude Desktop Input: "Append December 31, 2026 as a holiday to existing US holidays with timezone -05:00"
Result: New holiday added to existing US holiday list
```

---

## System Requirements

### AWS Prerequisites

| Requirement               | Details                                |
| ------------------------- | -------------------------------------- |
| **AWS Account**     | Active account with Lambda permissions |
| **AWS CLI**         | v2.0+ installed and configured         |
| **SAM CLI**         | v1.60+ (optional, for local testing)   |
| **.NET SDK**        | .NET 8.0 or later (for building)       |
| **IAM Permissions** | Lambda, API Gateway, CloudFormation    |

### Local Build Tools

- Windows 10+, macOS 11+, or Linux
- PowerShell (for scripts)
- 500 MB disk space

---

## Quick Start

```powershell
# 1. Clone the repository
git clone https://github.com/Nuwantha57/MCP_Server.git
cd MCP_Server

# 2. Configure AWS credentials
aws configure --profile myprofile
# Enter: Access Key ID, Secret Access Key, Region (e.g., us-east-1)

# 3. Navigate to project
cd c:\MCP_Server

# 4. Deploy to AWS Lambda
sam build
sam deploy --guided --profile myprofile

# 5. Get your API endpoint (from output)
# https://xxxxx.execute-api.us-east-1.amazonaws.com/prod

# 6. Test with Claude!
```

---

## AWS Lambda Deployment

### Step-by-Step Instructions

#### 1. Install Prerequisites

```powershell
# Install AWS CLI (if not installed)
# Download from: https://aws.amazon.com/cli/

# Verify AWS CLI
aws --version

# Install SAM CLI (recommended)
# Download from: https://docs.aws.amazon.com/serverless-application-model/

# Verify SAM
sam --version

# Install .NET SDK (if not installed)
dotnet --version
```

#### 2. Create IAM User and Get AWS Credentials

**Important:** You need to create an **IAM user** explicitly to get Access Key ID and Secret Access Key. AWS root account credentials are not recommended for deployments.

##### Step 2a: Create IAM User in AWS Console

1. **Log in to AWS Console**
   - Go to https://console.aws.amazon.com/
   - Sign in with your AWS account (root account)

2. **Navigate to IAM**
   - Search for "IAM" in the AWS console search bar
   - Click on "Identity and Access Management (IAM)"

3. **Create New User**
   - In the left sidebar, click **Users**
   - Click **Create user** button
   - Enter username: `mcp-server-deployer` (or any name you prefer)
   - Click **Next**

4. **Set Permissions**
   - Select **Attach policies directly**
   - Search for and select these policies:
     - `AWSLambdaFullAccess` - For Lambda management
     - `AmazonAPIGatewayAdministrator` - For API Gateway
     - `IAMFullAccess` - For IAM role creation
     - `CloudFormationFullAccess` - For CloudFormation stack management
   - Click **Next** → **Create user**

5. **Generate Access Keys**
   - Click on the newly created user from the Users list
   - Click **Security credentials** tab
   - Under **Access keys**, click **Create access key**
   - Select **Command Line Interface (CLI)**
   - Check "I understand..." checkbox
   - Click **Next**
   - Copy and **save securely** your:
     - **Access Key ID** (starts with `AKIA...`)
     - **Secret Access Key** (long random string - only shown once!)
   - ⚠️ **Keep these secret!** Anyone with these keys can access your AWS account

##### Step 2b: Configure AWS CLI with Your Credentials

```powershell
# Run the configuration command
aws configure --profile myprofile

# When prompted, enter:
# AWS Access Key ID: AKIA... (the one you copied above)
# AWS Secret Access Key: [paste the secret key from above]
# Default region name: us-east-1 (or your preferred region)
# Default output format: json

# Test your credentials
aws sts get-caller-identity --profile myprofile

# Expected output:
# {
#     "UserId": "AIDAI...",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/mcp-server-deployer"
# }
```

**Note:** The credentials are stored locally in `~/.aws/credentials` (never commit to git!)

#### 3. Build the Project

```powershell
cd c:\MCP_Server

# Build using SAM
sam build

# Output: Build Succeeded
```

#### 4. Deploy to Lambda

```powershell
# First time deployment (guided)
sam deploy --guided --profile myprofile

# Prompts:
# Stack name: mcp-server-stack
# AWS Region: us-east-1
# Confirm changes: y
# Allow IAM role creation: y
# Save arguments: y

# Takes 3-5 minutes
```

#### 5. Get Your API Endpoint

```powershell
# After deployment, note the outputs:
# McpServerApiEndpoint: https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
# GetMeetingTimeEndpoint: https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/api/tools/getMeetingTime

# Save these - you'll need them for Claude!
```

#### 6. Test the Deployment

```powershell
# Test getMeetingTime
curl -X POST "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/api/tools/getMeetingTime" `
  -H "Content-Type: application/json" `
  -d '{
    "country1": "US",
    "country2": "UK",
    "preferredTime": "14:00",
    "meetingDate": "2026-12-25"
  }'

# Response shows holiday detection!
```

---

## Holiday Management via Claude

### Key Feature: Dynamic Holiday Updates via Natural Language

Update holidays by simply typing commands to Claude Desktop - changes apply to AWS Lambda environment variables instantly!

### Setup Claude Desktop

#### 1. Configure Claude Desktop

**Windows:** Edit `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** Edit `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-lambda-server": {
      "command": "node",
      "args": ["c:\\MCP_Server\\bridge.js"],
      "env": {
        "AWS_ACCESS_KEY_ID": "YOUR_AWS_ACCESS_KEY",
        "AWS_SECRET_ACCESS_KEY": "YOUR_AWS_SECRET_KEY",
        "AWS_REGION": "us-east-1",
        "LAMBDA_FUNCTION_NAME": "mcp-server-function"
      }
    }
  }
}
```

**Important:** Use AWS credentials with `lambda:UpdateFunctionConfiguration` permission.

#### 2. Restart Claude Desktop

Exit Claude Desktop completely (check system tray) and restart.

Now you can see the connectors by clicking the **(+)** icon. If the connector is not visible, please reinstall the Claude desktop application.

---

## Claude Desktop Usage Examples

### Example 1: Update Single Country Holiday (Replace Mode)

**Claude Desktop Input:**

```
Update US holidays to December 23-27, 2026 with timezone -05:00
```

**What Happens:**

1. Claude parses your request
2. Calls `updateCountryHolidays` tool
3. AWS Lambda environment variable `HOLIDAYS_US` is updated
4. New value: `[{"start":"2026-12-23T00:00-05:00","end":"2026-12-27T23:59-05:00"}]`
5. Old holidays are **replaced** with new ones

**Claude Response:**

```
✅ Updated US holidays successfully!
Holiday period: December 23-27, 2026 (EST timezone -05:00)
AWS Lambda environment variable HOLIDAYS_US has been updated.
The changes are live immediately.
```

---

### Example 2: Update Multiple Countries Simultaneously

**Claude Desktop Input:**

```
Update US holidays to December 23-27, 2026 with timezone -05:00
Update UK holidays to December 20-25, 2026 with timezone +00:00
```

**What Happens:**

1. Claude processes both updates
2. Makes two tool calls (or batch update)
3. Updates both `HOLIDAYS_US` and `HOLIDAYS_UK` environment variables
4. Both countries updated in parallel

**Claude Response:**

```
✅ Updated holidays for 2 countries:

US Holidays:
- Period: December 23-27, 2026 (EST -05:00)
- Variable: HOLIDAYS_US updated

UK Holidays:
- Period: December 20-25, 2026 (GMT +00:00)
- Variable: HOLIDAYS_UK updated

All changes are live in AWS Lambda.
```

---

### Example 3: Append New Holiday to Existing Ones

**Claude Desktop Input:**

```
Append December 31, 2026 as a holiday to existing US holidays with timezone -05:00
```

**What Happens:**

1. Claude reads existing `HOLIDAYS_US` value
2. Parses existing holiday array
3. Adds new holiday entry: `{"start":"2026-12-31T00:00-05:00","end":"2026-12-31T23:59-05:00"}`
4. Updates environment variable with combined array
5. Old holidays are **preserved** and new one is **appended**

**Example Before:**

```json
[
  {"start":"2026-12-25T00:00-05:00","end":"2026-12-26T23:59-05:00"}
]
```

**Example After:**

```json
[
  {"start":"2026-12-25T00:00-05:00","end":"2026-12-26T23:59-05:00"},
  {"start":"2026-12-31T00:00-05:00","end":"2026-12-31T23:59-05:00"}
]
```

**Claude Response:**

```
✅ Appended new holiday to US holidays!

Existing holidays: December 25-26, 2026
New holiday added: December 31, 2026

Total US holidays now: 2 entries
AWS Lambda variable HOLIDAYS_US updated with combined list.
```

---

### Example 4: Update with Date Range

**Claude Desktop Input:**

```
Update India holidays to January 26-27, 2026 and October 2-3, 2026 with timezone +05:30
```

**What Happens:**

1. Claude creates two holiday entries
2. Updates `HOLIDAYS_INDIA` environment variable
3. Both holiday periods included in single update

**Result in Lambda:**

```json
[
  {"start":"2026-01-26T00:00+05:30","end":"2026-01-27T23:59+05:30"},
  {"start":"2026-10-02T00:00+05:30","end":"2026-10-03T23:59+05:30"}
]
```

---

## How It Works

### Architecture Flow

```
┌─────────────────┐
│ Claude Desktop  │  User types: "Update US holidays to Dec 23-27, 2026 with timezone -05:00"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   bridge.js     │  Node.js bridge interprets command
│   (MCP Bridge)  │  Calls updateCountryHolidays tool
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AWS Lambda     │  Lambda function receives update request
│  (MCP Server)   │  Validates format and permissions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lambda Env Var │  HOLIDAYS_US updated to:
│  HOLIDAYS_US    │  [{"start":"2026-12-23T00:00-05:00","end":"2026-12-27T23:59-05:00"}]
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   ✅ Success    │  Update complete in 2-5 seconds
│   Live Changes  │  No redeployment needed!
└─────────────────┘
```

### Holiday Date Format

Holidays are stored as JSON arrays in AWS Lambda environment variables. Each country has its own environment variable.

**Format:**

```json
[
  {
    "start": "2026-12-23T00:00-05:00",
    "end": "2026-12-27T23:59-05:00"
  }
]
```

**Date Format Components:**

- `2026-12-23` - Date (YYYY-MM-DD)
- `T00:00` - Start time (HH:MM, typically 00:00)
- `-05:00` - Timezone offset (required, ISO 8601 format)
- End time typically `23:59` for full day coverage

### Environment Variables in AWS Lambda

Each country has a dedicated environment variable:

| Country     | Environment Variable | Example Value                                                           |
| ----------- | -------------------- | ----------------------------------------------------------------------- |
| US          | `HOLIDAYS_US`      | `[{"start":"2026-12-25T00:00-05:00","end":"2026-12-26T23:59-05:00"}]` |
| UK          | `HOLIDAYS_UK`      | `[{"start":"2026-12-25T00:00+00:00","end":"2026-12-28T23:59+00:00"}]` |
| India       | `HOLIDAYS_INDIA`   | `[{"start":"2026-01-26T00:00+05:30","end":"2026-01-27T23:59+05:30"}]` |
| Australia   | `HOLIDAYS_AU`      | `[{"start":"2026-12-25T00:00+11:00","end":"2026-12-27T23:59+11:00"}]` |
| Japan       | `HOLIDAYS_JP`      | `[{"start":"2026-01-01T00:00+09:00","end":"2026-01-03T23:59+09:00"}]` |
| Germany     | `HOLIDAYS_DE`      | `[{"start":"2026-12-25T00:00+01:00","end":"2026-12-26T23:59+01:00"}]` |
| France      | `HOLIDAYS_FR`      | `[{"start":"2026-12-25T00:00+01:00","end":"2026-12-26T23:59+01:00"}]` |
| Singapore   | `HOLIDAYS_SG`      | `[{"start":"2026-01-28T00:00+08:00","end":"2026-01-29T23:59+08:00"}]` |
| Brazil      | `HOLIDAYS_BR`      | `[{"start":"2026-12-25T00:00-03:00","end":"2026-12-26T23:59-03:00"}]` |
| New Zealand | `HOLIDAYS_NZ`      | `[{"start":"2026-12-25T00:00+13:00","end":"2026-12-27T23:59+13:00"}]` |

---

## Troubleshooting

### Issue 1: Claude Desktop Not Connecting to MCP Server

**Symptoms:**

- No MCP tools appear in Claude Desktop
- Error messages in Claude about connection

**Solutions:**

1. **Verify Configuration File:**

```powershell
# Windows - Check if file exists and has correct format
notepad %APPDATA%\Claude\claude_desktop_config.json

# File should contain:
{
  "mcpServers": {
    "mcp-lambda-server": {
      "command": "node",
      "args": ["c:\\MCP_Server\\bridge.js"],
      "env": {
        "AWS_ACCESS_KEY_ID": "AKIAXXXXXXXX",
        "AWS_SECRET_ACCESS_KEY": "xxxxxxxxxxxxxxxx",
        "AWS_REGION": "us-east-1",
        "LAMBDA_FUNCTION_NAME": "mcp-server-function"
      }
    }
  }
}
```

2. **Check bridge.js Path:**

```powershell
# Verify file exists
Test-Path "c:\MCP_Server\bridge.js"
# Should return: True
```

3. **Verify Node.js:**

```powershell
node --version
# Should be v22.0+
```

4. **Restart Claude Properly:**

- Right-click Claude icon in system tray
- Click "Quit" or "Exit"
- Wait 5 seconds
- Start Claude Desktop again

5. **Check Claude Logs:**

```powershell
# View logs for errors
notepad %APPDATA%\Claude\logs\mcp-server.log

# Look for connection errors or AWS credential issues
```

---

### Issue 2: Holiday Updates Not Working

**Symptoms:**

- Claude says update succeeded but AWS Lambda variable unchanged
- Error: "Failed to update holidays"

**Solutions:**

1. **Check AWS Permissions:**

```powershell
# Test if credentials have Lambda update permissions
aws lambda update-function-configuration \
  --function-name mcp-server-function \
  --environment "Variables={TEST='test'}" \
  --profile myprofile

# If this fails, you need lambda:UpdateFunctionConfiguration permission
```

2. **Verify IAM Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionConfiguration",
        "lambda:GetFunctionConfiguration"
      ],
      "Resource": "arn:aws:lambda:us-east-1:*:function:mcp-server-function"
    }
  ]
}
```

3. **Check Holiday Format:**

```powershell
# Verify JSON is valid
# CORRECT format:
[{"start":"2026-12-25T00:00-05:00","end":"2026-12-26T23:59-05:00"}]

# WRONG formats (will fail):
{"start":"2026-12-25T00:00-05:00","end":"2026-12-26T23:59-05:00"}  # Missing array brackets
[{"start":"2026-12-25","end":"2026-12-26"}]  # Missing time and timezone
```

4. **Check Lambda Logs:**

```powershell
# View Lambda execution logs
aws logs tail /aws/lambda/mcp-server-function --follow --profile myprofile

# Look for errors when Claude calls updateCountryHolidays
```

5. **Wait for Propagation:**

- Changes take 2-5 seconds to propagate
- Wait a few seconds before verifying
- Check again:

```powershell
aws lambda get-function-configuration \
  --function-name mcp-server-function \
  --query 'Environment.Variables.HOLIDAYS_US'
```

---

### Debugging Checklist

When holiday updates aren't working, check:

- [ ] Claude Desktop configuration file exists and is valid JSON
- [ ] AWS credentials are correct and have Lambda permissions
- [ ] Lambda function name is "mcp-server-function" (or correct name)
- [ ] AWS region matches in config and Lambda deployment
- [ ] Holiday format includes timezone offset (e.g., -05:00)
- [ ] JSON format is valid array: `[{...}]` not `{...}`
- [ ] Waited 2-5 seconds for changes to propagate
- [ ] Node.js v22+ is installed
- [ ] bridge.js file exists at specified path
- [ ] Claude Desktop fully restarted (quit from system tray)

---

### Getting Debug Information

```powershell
# 1. Check Claude logs
type %APPDATA%\Claude\logs\mcp-server.log

# 2. Check AWS Lambda configuration
aws lambda get-function-configuration \
  --function-name mcp-server-function \
  --profile myprofile

# 3. Check all environment variables
aws lambda get-function-configuration \
  --function-name mcp-server-function \
  --profile myprofile \
  --query 'Environment.Variables'

# 4. Test Lambda directly
aws lambda invoke \
  --function-name mcp-server-function \
  --payload '{"test":"data"}' \
  --profile myprofile \
  response.json

# 5. View Lambda execution logs
aws logs tail /aws/lambda/mcp-server-function \
  --follow \
  --profile myprofile
```

---

## Summary

### ✅ What You Deployed

- **AWS Lambda Function** - Serverless compute running MCP Server
- **API Gateway** - HTTP endpoints for tool access
- **CloudWatch Logs** - Monitoring and debugging
- **Environment Variables** - Dynamic holiday storage (HOLIDAYS_US, HOLIDAYS_UK, etc.)

### ✅ What You Can Do via Claude Desktop

1. **Update Single Country Holiday**

   ```
   "Update US holidays to December 23-27, 2026 with timezone -05:00"
   ```
2. **Update Multiple Countries at Once**

   ```
   "Update US holidays to December 23-27, 2026 with timezone -05:00
    Update UK holidays to December 20-25, 2026 with timezone +00:00"
   ```
3. **Append New Holiday to Existing**

   ```
   "Append December 31, 2026 as a holiday to existing US holidays with timezone -05:00"
   ```
4. **Clear All Holidays**

   ```
   "Clear all US holidays"
   ```
