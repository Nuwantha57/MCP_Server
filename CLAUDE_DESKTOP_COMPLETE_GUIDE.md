# Claude Desktop Integration - Complete Guide

## Status: ✅ SETUP COMPLETE

The bridge server is now running and Claude Desktop is configured to use the AWS Lambda MCP Server.

## Configuration Details

### Bridge Server
- **Status**: Running at `http://localhost:3000`
- **Backend**: AWS Lambda (`https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com/prod/api/tools`)
- **Started**: Now

### Claude Desktop Config
- **Location**: `%APPDATA%\Claude\claude_desktop_config.json`
- **MCP Server**: mcp-lambda-server
- **Entry Point**: c:\MCP_Server\bridge.js (Node.js)

## Test Scenarios with Holiday Detection

### Test 1: Meeting Time on Christmas (Holiday Detected)
**Prompt in Claude Desktop:**
```
Find a meeting time between US and UK for December 25, 2026 at 9:00 AM.
Tell me if there are holidays and suggest alternatives.
```

**Expected Response:**
```
When it's 04:00 in US, it's 09:00 in UK
⚠️ BOTH COUNTRIES ON HOLIDAY (Dec 25) 
- USA Holiday: Christmas (Dec 25-26)
- UK Holiday: Christmas (Dec 25-28)
- Next business day US: Monday Dec 28
- Next business day UK: Tuesday Dec 29
```

### Test 2: Meeting Time on Regular Day (No Holiday)
**Prompt in Claude Desktop:**
```
What time would it be in US when it's 14:00 in UK on January 15, 2026?
```

**Expected Response:**
```
When it's 14:00 in UK, it's 09:00 in US
Both locations working normally on this date
```

### Test 3: India and Singapore Holiday
**Prompt in Claude Desktop:**
```
Find a meeting time between India and Singapore for January 29, 2026.
Check if there are any holidays.
```

**Expected Response:**
```
Singapore Chinese New Year: Jan 29 - Feb 1
India Regular working day
Suggested: Different time after Feb 1
```

### Test 4: Multiple Countries at Different Times
**Prompt in Claude Desktop:**
```
What time is it in these timezones right now:
- New York
- London  
- Tokyo
- Sydney
```

**Expected Response:**
```
Current time in different zones with timezone offsets
```

### Test 5: Simple Math Test
**Prompt in Claude Desktop:**
```
Add 245 and 378 using the add tool
```

**Expected Response:**
```
245 + 378 = 623
```

### Test 6: Text Analysis
**Prompt in Claude Desktop:**
```
Analyze this text: "The quick brown fox jumps over the lazy dog"
```

**Expected Response:**
```
Word count: 9
Character count: 44
Sentences: 1
Analysis with statistics
```

## Step-by-Step: Using Claude Desktop

### 1. Make Sure Bridge is Running
```powershell
cd c:\MCP_Server
node bridge.js
# Should show: Bridge server running on http://localhost:3000
```

### 2. Restart Claude Desktop
- Close Claude Desktop completely
- Reopen Claude Desktop
- It should now have access to the MCP tools

### 3. Test Connection
In Claude, try:
```
Echo test: say hello
```

If Claude responds with "Hello from Claude", the MCP is connected.

### 4. Test Holiday Detection
```
Find a meeting time for December 25, 2026 between US and UK
```

## Available Tools Through Claude Desktop

| Tool | Purpose | Example |
|------|---------|---------|
| echo | Echo messages | "Say hello using echo" |
| reverse | Reverse text | "Reverse the word HELLO" |
| add | Add numbers | "Calculate 10 + 20" |
| getDateTime | Get time in timezone | "What time is it in Tokyo?" |
| analyzeText | Analyze text | "Analyze sentiment of this text" |
| getMeetingTime | Find meeting times with holidays | "Meeting time between US and UK on Dec 25" |

## Holidays Configured

### Christmas 2026
- **UK**: Dec 25-28 (4 days)
- **US**: Dec 25-26 (2 days)
- **Germany**: Dec 25-26 (2 days)
- **France**: Dec 25 (1 day)
- **Brazil**: Dec 25 (1 day)

### Chinese New Year 2026
- **Singapore**: Jan 29 - Feb 1 (4 days)

### Other Holidays
- **India**: Republic Day (Jan 26), Holi (Mar 8)
- **Japan**: Coming of Age Day (Jan 12)
- **Australia**: Australia Day (Jan 26)
- **NZ**: New Year Holiday (Jan 2)

## Troubleshooting

### Bridge Server Won't Start
```powershell
# Check if port 3000 is available
netstat -ano | findstr :3000

# Kill process using port 3000
Get-Process | Where-Object {$_.Id -eq <PID>} | Stop-Process -Force

# Try again
node bridge.js
```

### Claude Desktop Doesn't See Tools
1. Verify config file exists: `%APPDATA%\Claude\claude_desktop_config.json`
2. Verify bridge.js path in config is correct
3. Restart Claude Desktop completely
4. Check bridge.js is still running

### Holiday Detection Not Working
1. Verify environment variables set in Lambda
2. Check holiday format is valid JSON with ISO8601 timestamps
3. Test Lambda directly:
```powershell
$endpoint = "https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com/prod/api/tools/getMeetingTime"
$payload = @{
  country1 = "US"
  country2 = "UK"
  preferredTime = "09:00"
  meetingDate = "2026-12-25"
} | ConvertTo-Json
Invoke-RestMethod -Uri $endpoint -Method POST -Body $payload -ContentType "application/json"
```

## Architecture Diagram

```
Claude Desktop
    ↓
Claude MCP Protocol (stdio)
    ↓
bridge.js (Node.js HTTP bridge)
    ↓
HTTP POST to localhost:3000
    ↓
bridge.js forwards to Lambda
    ↓
API Gateway
    ↓
AWS Lambda (dotnet8)
    ↓
.NET MCP Server with Holiday Detection
    ↓
Response back through chain
    ↓
Claude Desktop displays result
```

## Testing Checklist

- [ ] Bridge server is running
- [ ] Claude Desktop is restarted
- [ ] Echo test works
- [ ] Math (add) works
- [ ] Text reverse works
- [ ] DateTime in timezone works
- [ ] Meeting time calculation works
- [ ] Holiday detection shows Dec 25 as holiday
- [ ] Alternative business days suggested correctly

## Environment Variables in Lambda

All 10 countries have holiday data configured:
- HOLIDAYS_UK
- HOLIDAYS_US
- HOLIDAYS_INDIA
- HOLIDAYS_AUSTRALIA
- HOLIDAYS_JAPAN
- HOLIDAYS_GERMANY
- HOLIDAYS_FRANCE
- HOLIDAYS_SINGAPORE
- HOLIDAYS_BRAZIL
- HOLIDAYS_NZ

Format: ISO8601 timestamps with timezone offsets
```json
[
  {
    "start": "2026-12-25T00:00+00:00",
    "end": "2026-12-28T23:59+00:00"
  }
]
```

## Files Created

- `bridge.js` - Node.js bridge server (updated to use Lambda)
- `claude_desktop_config.json` - Claude Desktop MCP configuration
- `Setup-Claude-Desktop.ps1` - Automated setup script
- `CLAUDE_DESKTOP_SETUP_GUIDE.md` - This file

## Contact & Support

If you encounter issues:
1. Check bridge.js is running
2. Verify Lambda function is responding
3. Check Claude Desktop config file
4. Review logs in Lambda CloudWatch

## Next Steps (Optional)

1. **Add More Countries**: Update Lambda environment variables with more holidays
2. **Custom Holidays**: Modify holiday dates based on your organization
3. **Add API Key**: Implement security in bridge.js
4. **Persistent Bridge**: Set up bridge.js to run as Windows service
5. **Custom Tools**: Add more tools to mcptools
