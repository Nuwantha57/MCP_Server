# AWS Administrator Setup Required

## Issue

Your AWS user account (`lambda-developer`) does not have permissions to:
- Create IAM roles
- Create CloudFormation stacks

This is intentional security - only AWS administrators should create IAM roles.

---

## What Needs to Happen

An AWS account administrator must perform **ONE** of these options:

### Option A: Administrator Creates the IAM Role (Recommended)

The administrator should run this single PowerShell command:

```powershell
aws iam create-role `
    --role-name mcp-server-lambda-role `
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' `
    --region eu-north-1

# Then attach the execution policy
aws iam attach-role-policy `
    --role-name mcp-server-lambda-role `
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Then grant the user permission to use the role
aws iam put-user-policy `
    --user-name lambda-developer `
    --policy-name mcp-server-lambda-pass-role `
    --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"iam:PassRole","Resource":"arn:aws:iam::811146558818:role/mcp-server-lambda-role"}]}'
```

**OR use the script provided:**

```powershell
cd C:\MCP_Server
.\ADMIN_SETUP_LAMBDA_ROLE.ps1
```

### Option B: Grant User IAM Permissions

Instead, the administrator could grant you full IAM and Lambda permissions by adding this managed policy:
- `AWSLambdaFullAccess`
- `IAMFullAccess`

---

## What Happens After Role is Created

Once the role exists, you can deploy by running:

```powershell
cd C:\MCP_Server
.\deploy-lambda-direct.ps1 -Region eu-north-1
```

This will:
1. ✅ Create the Lambda function
2. ✅ Create the API Gateway endpoint
3. ✅ Set up environment variables for holidays
4. ✅ Make your getMeetingTime tool available via HTTPS

---

## Current Status

Your deployment package is ready:
- ✅ .NET code compiled
- ✅ Lambda package created (9.1 MB)
- ✅ All deployment scripts ready
- ✅ Documentation complete
- ⏳ **Waiting for**: AWS administrator to create IAM role

---

## After Setup

Once the role is created, deployment takes ~5 minutes and you'll have:
- ✅ Lambda function running (auto-scaling)
- ✅ API Gateway endpoint (public HTTPS)
- ✅ Holiday detection enabled
- ✅ CloudWatch logs enabled
- ✅ Cost: FREE (within AWS Free Tier)

---

## Who Can Help?

Ask your AWS account administrator to:
1. Read this file
2. Run the ADMIN_SETUP_LAMBDA_ROLE.ps1 script
3. Confirm role creation is complete

Then you can proceed with deployment!

---

## Contact Information

**Your AWS Account ID**: 811146558818
**Your AWS User**: lambda-developer  
**Required Role Name**: mcp-server-lambda-role
**Required Region**: eu-north-1
