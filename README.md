```

```

# MCP Server - Claude Desktop Integration

Production-ready MCP (Model Context Protocol) server that connects Claude Desktop to AWS Lambda, enabling dynamic holiday management and timezone-aware meeting scheduling.

## 🚀 Quick Start

### Prerequisites

- Node.js v22+ installed
- AWS Lambda function deployed
- AWS credentials (Access Key ID, Secret Access Key)

### Setup Claude Desktop

1. **Configure Claude Desktop:**

   - Edit: `%APPDATA%\Claude\claude_desktop_config.json`

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
2. **Restart Claude Desktop completely** (exit from system tray)
3. **Test:**

   ```
   Find a meeting time on December 25, 2026 between US and UK at 9 AM
   ```

## 🛠️ Available Tools

1. **getMeetingTime** - Find optimal meeting times with holiday detection (US, UK, India, AU, JP, DE, FR, SG, BR, NZ)
2. **updateCountryHolidays** - Dynamically update holidays via Claude
3. **echo**, **add**, **reverse** - Utility tools
4. **getDateTime** - Get current time in any timezone
5. **analyzeText** - Analyze text content

## 📝 Usage Examples

**Update Holidays:**

```
Update UK holidays to December 20-25, 2026 with timezone +00:00
```

**Check Meeting Times:**

```
Find a meeting time on December 22, 2026 between UK and US at 9 AM
```

## 📁 Key Files

- `bridge.js` - MCP bridge server (connects Claude Desktop to Lambda)
- `src/MCP.Server/` - AWS Lambda function (.NET)
- `COMPLETE_DOCUMENTATION.md` - Full setup guide
- `CLAUDE_HOLIDAY_UPDATE_TESTING.md` - Testing guide
- `START_HERE.md` - Getting started
- `docs/` - Technical documentation

## 🚢 Deployment

**AWS Lambda:**

```powershell
.\deploy.ps1
```

See `COMPLETE_DOCUMENTATION.md` for full deployment instructions.

## 📚 Documentation

- **[START_HERE.md](START_HERE.md)** - Getting started guide
- **[COMPLETE_DOCUMENTATION.md](COMPLETE_DOCUMENTATION.md)** - Full setup guide
- **[CLAUDE_HOLIDAY_UPDATE_TESTING.md](CLAUDE_HOLIDAY_UPDATE_TESTING.md)** - Testing guide
- **[HOLIDAY_SETUP.md](HOLIDAY_SETUP.md)** - Holiday configuration
- **[UK_HOLIDAYS_UPDATE_IMPLEMENTATION.md](UK_HOLIDAYS_UPDATE_IMPLEMENTATION.md)** - Multi-country support
- **[docs/](docs/)** - Technical documentation

## 🔒 Security

- No hardcoded credentials - Uses environment variables only
- AWS SigV4 signing for secure API authentication
- .gitignore configured to prevent credential commits

## 🐛 Troubleshooting

**Bridge not connecting:**

1. Check Claude Desktop logs: `%APPDATA%\Claude\logs`
2. Verify environment variables in Claude config
3. Restart Claude Desktop completely (exit from system tray)

**Holiday updates not working:**

- Wait 5-10 seconds for Lambda to propagate changes
- Verify IAM permissions: `lambda:UpdateFunctionConfiguration`

## 🎯 Version

**v1.0.0** - Production Ready

- ✅ Multi-country holiday support
- ✅ AWS SigV4 authentication
- ✅ Secure credential management
- ✅ Full Claude Desktop integration
