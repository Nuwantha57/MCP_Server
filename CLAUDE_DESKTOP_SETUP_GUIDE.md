# Claude Desktop MCP Server Setup

## Step 1: Install Node.js (if not already installed)
```powershell
# Check if Node.js is installed
node --version
npm --version
```

## Step 2: Copy Configuration to Claude Desktop
```powershell
# Create Claude config directory if it doesn't exist
$claudeConfigDir = "$env:APPDATA\Claude"
if (-not (Test-Path $claudeConfigDir)) {
    New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
    Write-Host "✓ Created Claude config directory"
}

# Copy config file
$configSource = "c:\MCP_Server\claude_desktop_config.json"
$configDest = "$claudeConfigDir\claude_desktop_config.json"
Copy-Item -Path $configSource -Destination $configDest -Force
Write-Host "✓ Copied MCP config to: $configDest"
```

## Step 3: Start Bridge Server
```powershell
cd c:\MCP_Server
node bridge.js
```

You should see:
```
✓ Bridge server running on http://localhost:3000
Ready to forward requests to AWS Lambda MCP server
```

## Step 4: Restart Claude Desktop
Close and reopen Claude Desktop. The MCP server should now be connected.

## Step 5: Test with Claude
In Claude Desktop, try these prompts:

### Test 1: Echo Tool
```
Use the echo tool to say "Hello from Claude!"
```

### Test 2: Meeting Time with Holiday Detection
```
Find a meeting time between US and UK for December 25, 2026 at 9:00 AM.
Tell me if there are any holidays and suggest the next business day if needed.
```

### Test 3: Calculate
```
Add 15 and 27 using the add tool
```

### Test 4: Get DateTime
```
Get the current time in America/New_York timezone
```

## Configuration Details

- **Bridge Server**: Runs on `http://localhost:3000`
- **Backend**: AWS Lambda at `https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com/prod/api/tools`
- **Holiday Detection**: Configured for 10 countries
- **Tools Available**: echo, reverse, add, getDateTime, analyzeText, getMeetingTime

## Troubleshooting

### Bridge server won't start
```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process on port 3000 if needed
Get-Process | Where-Object {$_.Id -eq <PID>} | Stop-Process -Force
```

### Claude Desktop doesn't see the MCP server
1. Verify config file at: `%APPDATA%\Claude\claude_desktop_config.json`
2. Check that bridge.js path is correct (use full path)
3. Restart Claude Desktop completely
4. Check bridge.js logs for errors

### Lambda returns "not found"
1. Verify API endpoint: `https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com/prod/api/tools`
2. Check that tool name is correct (case-sensitive)
3. Verify request body format

## Example curl Test (without Claude)
```powershell
# Test bridge directly
$endpoint = "http://localhost:3000"
$payload = @{
  tool = "echo"
  args = @{ message = "Hello Bridge!" }
} | ConvertTo-Json

Invoke-RestMethod -Uri $endpoint -Method POST -Body $payload -ContentType "application/json"
```
