# 📚 Claude Desktop + AWS Lambda Integration - Documentation Index

## 🎯 START HERE

**New to this setup?** Start with: [QUICK_START.md](QUICK_START.md)

## 📖 Complete Guides

### For First-Time Setup
1. **[QUICK_START.md](QUICK_START.md)** ⚡
   - 3-step startup process
   - Quick reference card
   - Troubleshooting

2. **[CLAUDE_DESKTOP_READY.md](CLAUDE_DESKTOP_READY.md)** ✨
   - Complete overview
   - What's been deployed
   - Feature summary

### For Detailed Information
3. **[FINAL_SETUP_GUIDE.md](FINAL_SETUP_GUIDE.md)** 📋
   - Step-by-step setup
   - Architecture diagram
   - Full troubleshooting

4. **[CLAUDE_DESKTOP_SETUP_GUIDE.md](CLAUDE_DESKTOP_SETUP_GUIDE.md)** 🔧
   - Detailed configuration
   - Testing procedures
   - Manual setup instructions

### For Lambda/AWS Info
5. **[LAMBDA_DEPLOYMENT_COMPLETE.md](LAMBDA_DEPLOYMENT_COMPLETE.md)** ☁️
   - AWS Lambda details
   - API Gateway info
   - Environment variables

## 🚀 Quick Commands

### Start Everything
```powershell
# Start bridge server
cd c:\MCP_Server
node bridge.js

# Then restart Claude Desktop
# Then test with: "Find a meeting time for Dec 25, 2026 between US and UK"
```

### Test Bridge Directly
```powershell
# Test echo
$p = @{ tool = "echo"; args = @{ message = "test" } } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000 -Method POST -Body $p -ContentType application/json

# Test meeting time with holidays
$p = @{
  tool = "getMeetingTime"
  args = @{
    country1 = "US"
    country2 = "UK"
    preferredTime = "09:00"
    meetingDate = "2026-12-25"
  }
} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000 -Method POST -Body $p -ContentType application/json
```

### Test Lambda Directly
```powershell
$payload = @{
  country1 = "US"
  country2 = "UK"
  preferredTime = "09:00"
  meetingDate = "2026-12-25"
} | ConvertTo-Json

$endpoint = "https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com/prod/api/tools/getMeetingTime"
Invoke-RestMethod -Uri $endpoint -Method POST -Body $payload -ContentType application/json
```

## 📁 File Structure

```
c:\MCP_Server\
│
├── 🌉 BRIDGE SERVER
│   ├── bridge.js                    (Node.js HTTP bridge)
│   └── start-bridge.bat             (Quick start batch file)
│
├── 🎯 CONFIGURATION
│   └── claude_desktop_config.json   (Claude Desktop MCP config)
│
├── 📚 DOCUMENTATION
│   ├── QUICK_START.md               (START HERE!)
│   ├── CLAUDE_DESKTOP_READY.md      (Overview & features)
│   ├── FINAL_SETUP_GUIDE.md         (Detailed setup)
│   ├── CLAUDE_DESKTOP_SETUP_GUIDE.md (Configuration guide)
│   ├── LAMBDA_DEPLOYMENT_COMPLETE.md (AWS Lambda info)
│   ├── INDEX.md                     (This file)
│   └── README.md                    (Repository info)
│
├── 🔧 AUTOMATION SCRIPTS
│   └── Setup-Claude-Desktop.ps1     (Automated setup)
│
└── 📦 SOURCE CODE
    ├── src/MCP.Server/
    │   ├── Program.cs               (Main server + ParseHolidays)
    │   ├── LambdaEntrypoint.cs      (AWS Lambda handler)
    │   └── MCP.Server.csproj        (Project file)
    │
    └── tests/                       (Test files)
```

## 🎯 What Each Tool Does

| Tool | Purpose | Example Use Case |
|------|---------|------------------|
| **getMeetingTime** | Find optimal meeting times across timezones with holiday detection | "Find meeting time for US-UK team on Dec 25, 2026" |
| **echo** | Echo back messages | "Echo hello" |
| **add** | Add two numbers | "Add 245 and 378" |
| **reverse** | Reverse a text string | "Reverse HELLO" |
| **getDateTime** | Get current time in a timezone | "What time is it in Tokyo?" |
| **analyzeText** | Analyze text content | "Analyze this text for word count" |

## 🌍 Holidays Configured

### 2026 Holidays by Country

| Country | Holiday | Dates | Type |
|---------|---------|-------|------|
| 🇬🇧 UK | Christmas | Dec 25-28 | 4 days |
| 🇺🇸 US | Christmas | Dec 25-26 | 2 days |
| 🇩🇪 Germany | Christmas | Dec 25-26 | 2 days |
| 🇫🇷 France | Christmas | Dec 25 | 1 day |
| 🇧🇷 Brazil | Christmas | Dec 25 | 1 day |
| 🇯🇵 Japan | Coming of Age | Jan 12 | 1 day |
| 🇮🇳 India | Republic Day | Jan 26 | 1 day |
| 🇮🇳 India | Holi | Mar 8 | 1 day |
| 🇦🇺 Australia | Australia Day | Jan 26 | 1 day |
| 🇸🇬 Singapore | Chinese New Year | Jan 29-Feb 1 | 4 days |
| 🇳🇿 NZ | New Year | Jan 2 | 1 day |

## 🔗 Architecture

```
Claude Desktop
    ↓
MCP Protocol (stdio)
    ↓
bridge.js (localhost:3000)
    ↓
AWS API Gateway
    ↓
AWS Lambda (dotnet8)
    ↓
.NET MCP Server + McpTools
    ↓
Holiday Detection Engine
    ↓
Response back
```

## ✅ Verification Checklist

Before considering everything set up:

- [ ] Node.js installed (`node --version` works)
- [ ] Bridge server starts: `cd c:\MCP_Server && node bridge.js`
- [ ] Bridge listens on port 3000
- [ ] Claude Desktop restarts without errors
- [ ] Echo tool works in Claude
- [ ] Meet time shows holidays for Dec 25, 2026
- [ ] Alternative dates suggested correctly

## 🆘 Troubleshooting

### Problem → Solution Quick Links

| Issue | Solution |
|-------|----------|
| Bridge won't start | See [FINAL_SETUP_GUIDE.md](FINAL_SETUP_GUIDE.md#issue-bridge-wont-start) |
| Claude doesn't see tools | See [FINAL_SETUP_GUIDE.md](FINAL_SETUP_GUIDE.md#issue-claude-doesnt-see-mcp-tools) |
| Lambda returns "not found" | See [FINAL_SETUP_GUIDE.md](FINAL_SETUP_GUIDE.md#issue-lambda-returns-not-found) |
| No holiday detection | See [FINAL_SETUP_GUIDE.md](FINAL_SETUP_GUIDE.md#issue-no-holiday-detection) |
| Port 3000 in use | See [FINAL_SETUP_GUIDE.md](FINAL_SETUP_GUIDE.md#issue-port-3000-already-in-use) |

## 📞 Support Resources

### Documentation
- Quick Start: [QUICK_START.md](QUICK_START.md)
- Full Guide: [FINAL_SETUP_GUIDE.md](FINAL_SETUP_GUIDE.md)
- AWS Info: [LAMBDA_DEPLOYMENT_COMPLETE.md](LAMBDA_DEPLOYMENT_COMPLETE.md)

### Logging & Debugging
- **Bridge Logs:** Console output when running `node bridge.js`
- **Lambda Logs:** AWS CloudWatch `/aws/lambda/mcp-server-function`
- **Claude Logs:** Claude Desktop developer console

### AWS Console
- **Lambda:** `mcp-server-function` in `eu-north-1`
- **API Gateway:** `mcp-server-api` (ID: `7wljg1mha3`)
- **CloudWatch:** `/aws/lambda/mcp-server-function`

## 🎓 Example Claude Prompts

### Meeting Time with Holiday Detection
```
"Find a meeting time for my US team (EST) and UK team (GMT) 
for December 25, 2026 at 9 AM. Check for holidays."
```

### Multi-country Meeting
```
"What's the best time for a meeting with teams in:
- New York (US)
- London (UK) 
- Singapore
- Sydney (Australia)
on January 29, 2026? Check for holidays."
```

### Simple Tools
```
"Add 245 and 378"
"Reverse the word HELLO"
"What time is it in Tokyo?"
"Analyze this text: hello world"
```

## 📊 System Requirements

### For Bridge Server
- Windows 10/11
- Node.js v14+ (currently v22.20.0)
- Port 3000 available

### For AWS Lambda
- AWS Account (account ID: 811146558818)
- IAM User: lambda-developer
- Region: eu-north-1

### For Claude Desktop
- Claude Desktop installed
- MCP support enabled

## 🚀 Next Steps

1. **Start Bridge:** `cd c:\MCP_Server && node bridge.js`
2. **Restart Claude:** Close and reopen Claude Desktop
3. **Test:** Ask Claude about meeting times with holidays
4. **Explore:** Try all 6 tools
5. **Customize:** Add more holidays as needed

## 📝 Configuration Files

### Claude Desktop Config
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

### Environment Variables (Lambda)
- `HOLIDAYS_UK` - UK holidays
- `HOLIDAYS_US` - US holidays
- `HOLIDAYS_INDIA` - India holidays
- `HOLIDAYS_AUSTRALIA` - Australia holidays
- `HOLIDAYS_JAPAN` - Japan holidays
- `HOLIDAYS_GERMANY` - Germany holidays
- `HOLIDAYS_FRANCE` - France holidays
- `HOLIDAYS_SINGAPORE` - Singapore holidays
- `HOLIDAYS_BRAZIL` - Brazil holidays
- `HOLIDAYS_NZ` - New Zealand holidays

Format: ISO8601 JSON array with timezone offsets

## 🎉 You're Ready!

Everything is set up and ready to use. Start the bridge server and begin asking Claude about meeting times across timezones with automatic holiday detection!

---

**Documentation Version:** 1.0  
**Last Updated:** January 9, 2026  
**Status:** ✅ All systems operational

For quick start: → [QUICK_START.md](QUICK_START.md) ⚡
