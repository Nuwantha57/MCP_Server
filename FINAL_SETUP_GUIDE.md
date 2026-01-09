# Claude Desktop + AWS Lambda Integration - Final Setup

## ✅ DEPLOYMENT COMPLETE

Your MCP Server is now fully integrated with Claude Desktop and connected to AWS Lambda.

## Quick Start (3 Steps)

### Step 1: Start the Bridge Server
Open a PowerShell or Command Prompt and run:
```powershell
cd c:\MCP_Server
node bridge.js
```

You should see:
```
✓ Bridge server running on http://localhost:3000
Ready to forward requests to AWS Lambda
```

**OR** double-click: `start-bridge.bat`

### Step 2: Restart Claude Desktop
- Completely close Claude Desktop
- Reopen Claude Desktop
- The MCP should now be available

### Step 3: Test with Holiday Detection
In Claude Desktop, type this message:

```
Find a meeting time for December 25, 2026 between US and UK at 9 AM.
Check for holidays and suggest alternative dates.
```

**Expected Result:**
Claude should respond that both US and UK are on holiday and suggest December 28 (US) and December 29 (UK) as alternatives.

---

## Test Prompts for Claude Desktop

### 1. Holiday Detection Test
```
What's the best time for a meeting between US and UK on December 25, 2026?
Check if there are any holidays.
```

**Expected Output:**
- Both countries on holiday
- US holiday: Christmas (Dec 25-26)
- UK holiday: Christmas (Dec 25-28)
- Next business day suggestions

### 2. Simple Math Test
```
Add 245 and 378 together
```

**Expected Output:**
```
245 + 378 = 623
```

### 3. Text Reversal Test
```
Reverse the word "CLAUDE"
```

**Expected Output:**
```
EDUALC
```

### 4. Timezone Test
```
What time is it in Tokyo right now?
```

**Expected Output:**
Current time in Tokyo with timezone offset

### 5. Complex Holiday Scenario
```
I need to schedule a meeting with:
- Team in New York (US)
- Team in London (UK)
- Team in Singapore
- Team in Sydney (Australia)

What's the best time for January 29, 2026?
Check for holidays in all locations.
```

**Expected Output:**
- Singapore: Chinese New Year holiday (Jan 29 - Feb 1)
- Others: Working normally
- Suggestion: Schedule after Feb 1

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│     Claude Desktop (Windows)        │
│   - MCP Client running              │
│   - Configured to use bridge.js     │
└──────────┬──────────────────────────┘
           │
           │ MCP Protocol (JSON-RPC)
           │ via stdio
           │
┌──────────▼──────────────────────────┐
│   Node.js Bridge Server             │
│   localhost:3000                    │
│   - Receives MCP requests           │
│   - Forwards to Lambda API Gateway  │
└──────────┬──────────────────────────┘
           │
           │ HTTPS POST
           │
┌──────────▼──────────────────────────┐
│   AWS API Gateway (eu-north-1)      │
│   - Proxy routing                   │
│   - Authentication & logging        │
└──────────┬──────────────────────────┘
           │
           │ Invoke
           │
┌──────────▼──────────────────────────┐
│   AWS Lambda Function               │
│   - Runtime: dotnet8                │
│   - Handler: LambdaEntrypoint       │
│   - Memory: 512 MB                  │
└──────────┬──────────────────────────┘
           │
           │ Route to tool
           │
┌──────────▼──────────────────────────┐
│   McpTools (.NET)                   │
│   - getMeetingTime (with holidays)  │
│   - echo, reverse, add, etc.        │
└──────────┬──────────────────────────┘
           │
           │ Return response
           │
┌──────────▼──────────────────────────┐
│   Response through chain            │
│   → Lambda → API Gateway            │
│   → Bridge → Claude Desktop         │
└─────────────────────────────────────┘
```

---

## Configuration Files

### 1. Claude Desktop Config
**Location:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-lambda-server": {
      "command": "node",
      "args": ["c:\\MCP_Server\\bridge.js"],
      "description": "MCP Server connected to AWS Lambda with holiday detection"
    }
  }
}
```

### 2. Bridge Server
**File:** `c:\MCP_Server\bridge.js`
- Node.js HTTP server on port 3000
- Forwards requests to AWS Lambda
- Uses HTTPS with proper JSON handling

---

## Holiday Configuration

### Configured Countries & Dates

| Country | Holiday | Dates | Type |
|---------|---------|-------|------|
| **UK** | Christmas | Dec 25-28 | Fixed |
| **US** | Christmas | Dec 25-26 | Fixed |
| **Germany** | Christmas | Dec 25-26 | Fixed |
| **France** | Christmas | Dec 25 | Fixed |
| **Brazil** | Christmas | Dec 25 | Fixed |
| **Japan** | Coming of Age | Jan 12 | Fixed |
| **India** | Republic Day | Jan 26 | Fixed |
| **India** | Holi | Mar 8 | Fixed |
| **Australia** | Australia Day | Jan 26 | Fixed |
| **Singapore** | Chinese New Year | Jan 29-Feb 1 | Fixed |
| **NZ** | New Year Holiday | Jan 2 | Fixed |

### Holiday Data Format
```json
{
  "start": "2026-12-25T00:00+00:00",
  "end": "2026-12-28T23:59+00:00"
}
```

Format: ISO8601 with timezone offset (±HH:MM)

---

## Troubleshooting

### Issue: Bridge won't start
**Solution:**
```powershell
# Check Node.js is installed
node --version

# Verify file exists
Test-Path c:\MCP_Server\bridge.js

# Try starting again
cd c:\MCP_Server
node bridge.js
```

### Issue: Claude doesn't see MCP tools
**Solution:**
1. Verify config file location: `%APPDATA%\Claude\claude_desktop_config.json`
2. Verify bridge.js path is correct (use full path)
3. Restart Claude Desktop completely
4. Check bridge server is running on localhost:3000

### Issue: Lambda returns "not found"
**Solution:**
1. Check AWS Lambda function is running
2. Verify API Gateway endpoint: `https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com/prod/api/tools`
3. Test Lambda directly:
   ```powershell
   $payload = @{
     country1 = "US"
     country2 = "UK"
     preferredTime = "09:00"
     meetingDate = "2026-12-25"
   } | ConvertTo-Json
   
   $endpoint = "https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com/prod/api/tools/getMeetingTime"
   Invoke-RestMethod -Uri $endpoint -Method POST -Body $payload -ContentType "application/json"
   ```

### Issue: No holiday detection
**Solution:**
1. Verify Lambda environment variables are set
2. Check holiday format is valid JSON
3. Verify dates are ISO8601 format
4. Test with Dec 25, 2026 (known Christmas date)

### Issue: Port 3000 already in use
**Solution:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Try starting bridge again
node bridge.js
```

---

## Available Tools Through Claude

### 1. getMeetingTime
**Purpose:** Find optimal meeting times with holiday detection

**Usage in Claude:**
```
Find a meeting time between US and UK on December 25, 2026 at 9 AM
```

**Parameters:**
- country1, country2: Country codes (US, UK, INDIA, etc.)
- preferredTime: HH:MM format
- meetingDate: YYYY-MM-DD format

### 2. echo
**Purpose:** Echo back messages

**Usage in Claude:**
```
Echo "Hello from Claude"
```

### 3. add
**Purpose:** Add two numbers

**Usage in Claude:**
```
Add 15 and 27
```

### 4. reverse
**Purpose:** Reverse a string

**Usage in Claude:**
```
Reverse the text "HELLO"
```

### 5. getDateTime
**Purpose:** Get current time in a timezone

**Usage in Claude:**
```
What time is it in America/New_York?
```

### 6. analyzeText
**Purpose:** Analyze text content

**Usage in Claude:**
```
Analyze this text for word count and length
```

---

## AWS Resources

### Lambda Function
- **Name:** mcp-server-function
- **Runtime:** dotnet8
- **Handler:** MCP.Server::MCP.Server.LambdaEntrypoint::HandleAsync
- **Memory:** 512 MB
- **Region:** eu-north-1
- **Logs:** CloudWatch `/aws/lambda/mcp-server-function`

### API Gateway
- **ID:** 7wljg1mha3
- **Stage:** prod
- **Endpoint:** `https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com/prod/api/tools`

### IAM Role
- **Name:** mcp-server-lambda-role
- **Trust Policy:** Allows Lambda service
- **Attached Policy:** AWSLambdaBasicExecutionRole

---

## Files in c:\MCP_Server

- `bridge.js` - Node.js bridge server (main entry point)
- `start-bridge.bat` - Quick start batch file
- `claude_desktop_config.json` - Claude Desktop configuration
- `Setup-Claude-Desktop.ps1` - Setup automation script
- `CLAUDE_DESKTOP_COMPLETE_GUIDE.md` - Detailed guide
- `LAMBDA_DEPLOYMENT_COMPLETE.md` - Lambda deployment info
- `CLAUDE_DESKTOP_SETUP_GUIDE.md` - Setup guide

---

## Next Steps

1. **Start Bridge:** Run `node bridge.js` or `start-bridge.bat`
2. **Restart Claude:** Close and reopen Claude Desktop
3. **Test Tools:** Use the test prompts above
4. **Add More Holidays:** Update Lambda environment variables
5. **Persistent Bridge:** Set up as Windows service (optional)

---

## Support

If you encounter any issues:
1. Check bridge.js is running and listening on port 3000
2. Verify Lambda function is responding
3. Verify Claude Desktop config file is correct
4. Check AWS credentials are valid
5. Review CloudWatch logs in AWS Lambda console

---

**Status:** ✅ Ready for use with Claude Desktop

**Last Updated:** January 9, 2026
**All Components:** Deployed and tested
**Bridge Server:** Ready to connect Claude Desktop to AWS Lambda with holiday detection
