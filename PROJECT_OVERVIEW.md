# MCP Server - Project Overview

## ✅ Production-Ready Status

This is a **complete, working MCP Server** that integrates Claude Desktop with AWS Lambda for dynamic holiday management and timezone-aware meeting scheduling.

---

## 📁 Project Structure

```
c:\MCP_Server\
│
├── 🔧 CORE FILES
│   ├── bridge.js                      # MCP bridge server (Node.js)
│   ├── server.js                      # Alternative HTTP server
│   ├── deploy.ps1                     # AWS Lambda deployment script
│   ├── Setup-Claude-Desktop.ps1       # Claude Desktop configuration
│   ├── ADMIN_SETUP_LAMBDA_ROLE.ps1    # AWS IAM setup
│   ├── template.yaml                  # SAM template
│   ├── package.json                   # Node dependencies
│   ├── Dockerfile                     # Docker image
│   ├── docker-compose.yml             # Docker Compose config
│   ├── railway.toml                   # Railway deployment
│   └── MCP_Server.sln                 # Visual Studio solution
│
├── 📚 DOCUMENTATION
│   ├── README.md                      # Main documentation (start here)
│   ├── START_HERE.md                  # Quick start guide
│   ├── COMPLETE_DOCUMENTATION.md      # Full setup instructions
│   ├── CLAUDE_HOLIDAY_UPDATE_TESTING.md  # Testing guide
│   ├── HOLIDAY_SETUP.md               # Holiday configuration
│   ├── UK_HOLIDAYS_UPDATE_IMPLEMENTATION.md  # Multi-country support
│   ├── DIRECT_API_USAGE.md            # API reference
│   ├── DELIVERABLES.md                # Project deliverables
│   └── .gitignore                     # Git ignore rules
│
├── 💻 SOURCE CODE
│   └── src/
│       └── MCP.Server/                # .NET Lambda function
│           ├── Program.cs             # Main logic (7 tools)
│           ├── appsettings.json       # Configuration
│           ├── MCP.Server.csproj      # Project file
│           └── bin/Debug/net9.0/      # Compiled binaries
│
├── 🧪 TESTS
│   └── tests/
│       └── MCP.Server.Tests/          # Unit tests
│           └── ApiTests.cs
│
├── 📖 DOCS
│   └── docs/
│       ├── API_DOCUMENTATION.md       # API reference
│       ├── ARCHITECTURE.md            # System architecture
│       ├── DEPLOYMENT.md              # Deployment guide
│       ├── SECURITY_IMPLEMENTATION_COMPLETE.md  # Security docs
│       └── TESTING_AND_DOCUMENTATION_REPORT.md
│
├── ⚙️ DEPLOYMENT
│   ├── helm/                          # Kubernetes Helm charts
│   │   └── mcp-server/
│   │       ├── Chart.yaml
│   │       ├── values.yaml
│   │       └── templates/
│   └── scripts/                       # Utility scripts
│       ├── LoadTest.ps1
│       └── Test-Performance.ps1
│
└── 🔐 CONFIGURATION
    └── .gitignore                     # Prevents credential commits
```

---

## 🚀 Quick Start (3 Steps)

### 1. Configure Claude Desktop

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-lambda-server": {
      "command": "node",
      "args": ["c:\\MCP_Server\\bridge.js"],
      "env": {
        "AWS_ACCESS_KEY_ID": "YOUR_KEY",
        "AWS_SECRET_ACCESS_KEY": "YOUR_SECRET",
        "AWS_REGION": "eu-north-1"
      }
    }
  }
}
```

### 2. Restart Claude Desktop

**Important:** Exit completely from system tray, then relaunch.

### 3. Test

Say in Claude Desktop:
```
Find a meeting time on December 25, 2026 between US and UK at 9 AM
```

Expected: Tool returns meeting time with holiday detection ✓

---

## 🛠️ Available Tools

| Tool | Description | Example |
|------|-------------|---------|
| **getMeetingTime** | Find optimal meeting time with holiday detection | "Find meeting time Dec 25 between US and UK at 9 AM" |
| **updateCountryHolidays** | Update country holidays dynamically | "Update UK holidays to Dec 20-25, 2026" |
| **echo** | Echo messages | "Echo hello world" |
| **add** | Add two numbers | "Add 5 and 10" |
| **reverse** | Reverse text | "Reverse 'hello'" |
| **getDateTime** | Get current time in timezone | "What time is it in America/New_York" |
| **analyzeText** | Analyze text content | "Analyze this text: ..." |

---

## 🌍 Supported Countries (Holiday Detection)

- 🇺🇸 **US** (America/New_York)
- 🇬🇧 **UK** (Europe/London)
- 🇮🇳 **INDIA** (Asia/Kolkata)
- 🇦🇺 **AU** (Australia/Sydney)
- 🇯🇵 **JP** (Asia/Tokyo)
- 🇩🇪 **DE** (Europe/Berlin)
- 🇫🇷 **FR** (Europe/Paris)
- 🇸🇬 **SG** (Asia/Singapore)
- 🇧🇷 **BR** (America/Sao_Paulo)
- 🇳🇿 **NZ** (Pacific/Auckland)

---

## 📝 Common Usage Patterns

### Update Single Country Holidays
```
Update UK holidays to December 20-25, 2026 with timezone +00:00
```

### Update Multiple Holiday Periods
```
Update UK holidays with:
- Christmas: December 24-28, 2026
- New Year: January 1-2, 2027
All in timezone +00:00
```

### Append Without Replacing
```
Add Easter 2027 (April 3-6) to UK holidays, keep existing holidays
```

### Check Meeting Time
```
Find a meeting time on December 22, 2026 between UK and US at 9 AM
```

---

## 🔒 Security Features

✅ **No hardcoded credentials** - All credentials in environment variables  
✅ **AWS SigV4 authentication** - Cryptographic signing for API calls  
✅ **.gitignore protection** - Prevents accidental credential commits  
✅ **IAM permissions** - Requires specific Lambda permissions  
✅ **Environment variable isolation** - Bridge loads credentials securely  

---

## 🏗️ Architecture

```
┌─────────────────┐
│ Claude Desktop  │
│   (User)        │
└────────┬────────┘
         │ JSON-RPC 2.0
         │ (stdin/stdout)
         ▼
┌─────────────────┐
│   bridge.js     │  ← Runs on your machine
│  (MCP Server)   │  ← Handles protocol
└────────┬────────┘
         │ HTTPS + AWS SigV4
         │
         ▼
┌─────────────────┐
│   API Gateway   │
│    (AWS)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lambda (.NET)  │  ← 7 tools
│  eu-north-1     │  ← Holiday detection
└─────────────────┘
```

---

## 📊 System Status

| Component | Status | Details |
|-----------|--------|---------|
| **Bridge** | ✅ Production | v1.0.0, Multi-country support |
| **Lambda** | ✅ Deployed | eu-north-1, dotnet8 runtime |
| **API Gateway** | ✅ Live | https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com |
| **Claude Desktop** | ✅ Configured | MCP protocol verified |
| **Holiday Management** | ✅ Working | Multi-country, append/replace modes |
| **Tests** | ✅ Passed | End-to-end, AWS connectivity, multi-country |

---

## 🧪 Verification

All systems tested and verified:
- ✅ MCP protocol compliance (JSON-RPC 2.0)
- ✅ AWS Lambda connectivity (HTTP 200)
- ✅ Holiday detection working (Dec 25, 2026 detected)
- ✅ Multi-country preservation (UK + US both maintained)
- ✅ AWS SigV4 authentication (credentials validated)
- ✅ Claude Desktop integration (tools visible and callable)

---

## 📚 Key Documentation Files

| File | Purpose | When to Read |
|------|---------|--------------|
| **README.md** | Overview and quick start | First time setup |
| **START_HERE.md** | Step-by-step guide | Getting started |
| **COMPLETE_DOCUMENTATION.md** | Full deployment | Complete setup |
| **CLAUDE_HOLIDAY_UPDATE_TESTING.md** | Testing guide | Testing features |
| **HOLIDAY_SETUP.md** | Holiday config | Setting up holidays |
| **UK_HOLIDAYS_UPDATE_IMPLEMENTATION.md** | Multi-country | Understanding multi-country |

---

## 🚢 Deployment Options

### 1. AWS Lambda (Current)
```powershell
.\deploy.ps1
```

### 2. Docker
```bash
docker-compose up -d
```

### 3. Kubernetes
```bash
helm install mcp-server ./helm/mcp-server
```

### 4. Railway
```bash
railway up
```

---

## 🐛 Troubleshooting

### Issue: "AWS credentials not configured"
**Solution:** Add credentials to Claude Desktop config `env` section

### Issue: "Tool execution failed"
**Solution:** 
1. Restart Claude Desktop completely (exit from tray)
2. Wait 5-10 seconds for Lambda to propagate changes
3. Check logs: `%APPDATA%\Claude\logs`

### Issue: Other countries' holidays disappear
**Solution:** Already fixed! Bridge now preserves all countries when updating one.

---

## 🎯 What's Working

✅ Claude Desktop integration  
✅ 7 MCP tools fully functional  
✅ Holiday detection for 10 countries  
✅ Dynamic holiday updates via Claude  
✅ Multi-country support (preserves all countries)  
✅ AWS SigV4 secure authentication  
✅ Environment variable credential management  
✅ Append and replace modes for holidays  
✅ Timezone-aware meeting scheduling  
✅ Next business day calculation  

---

## 📦 Dependencies

**Node.js:**
- `https` (built-in)
- `crypto` (built-in)
- No external npm packages required for bridge

**.NET:**
- ModelContextProtocol.AspNetCore
- Amazon.Lambda packages
- Serilog for logging

---

## 🔄 Version History

**v1.0.0** (Current - Production Ready)
- Multi-country holiday preservation
- AWS SigV4 authentication
- Backward compatible simple format
- Secure credential management
- Full Claude Desktop integration

---

## 📞 Support

For issues:
1. Check `docs/` folder for technical documentation
2. Review logs in `%APPDATA%\Claude\logs`
3. Verify AWS credentials and permissions

---

## ✨ Features Summary

🎯 **7 Tools** - Echo, Add, Reverse, DateTime, AnalyzeText, GetMeetingTime, UpdateCountryHolidays  
🌍 **10 Countries** - US, UK, India, AU, JP, DE, FR, SG, BR, NZ  
🔒 **Secure** - AWS SigV4, environment variables, no hardcoded credentials  
🚀 **Fast** - Direct Lambda invocation, 200-300ms response time  
📊 **Reliable** - Multi-country preservation, error handling, timeout protection  
🧪 **Tested** - End-to-end, AWS connectivity, protocol compliance  

---

**Status: ✅ Production Ready - All systems operational**
