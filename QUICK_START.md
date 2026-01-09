# 🚀 Quick Start Card

## Start Bridge Server (DO THIS FIRST)

```powershell
cd c:\MCP_Server
node bridge.js
```

Expected output:
```
✓ Bridge server running on http://localhost:3000
Ready to forward requests to AWS Lambda
```

## Restart Claude Desktop

Close → Reopen Claude Desktop completely

## Test in Claude Desktop

Try this prompt:
```
Find a meeting time for December 25, 2026 between US and UK at 9 AM.
```

Expected response:
```
Both countries are on holiday:
- US: Dec 25-26 (Christmas)
- UK: Dec 25-28 (Christmas)
Next available: Dec 28 (US) / Dec 29 (UK)
```

---

## Configuration

**Bridge:**  
`c:\MCP_Server\bridge.js`

**Claude Config:**  
`%APPDATA%\Claude\claude_desktop_config.json`

**Lambda:**  
`https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com/prod/api/tools`

---

## Available Tools

| Tool | Use |
|------|-----|
| getMeetingTime | Find meetings (with holidays) |
| echo | Echo messages |
| add | Add numbers |
| reverse | Reverse text |
| getDateTime | Get time in timezone |
| analyzeText | Analyze text |

---

## Test Prompts

1. **Holidays:** "December 25 meeting between US and UK?"
2. **Math:** "Add 245 and 378"
3. **Reverse:** "Reverse the word HELLO"
4. **Time:** "Current time in Tokyo"
5. **Analysis:** "Analyze this text: hello world"

---

## Holidays 2026

🇬🇧 UK: Dec 25-28 (Christmas)
🇺🇸 US: Dec 25-26 (Christmas)
🇸🇬 Singapore: Jan 29-Feb 1 (Chinese New Year)
🇯🇵 Japan: Jan 12 (Coming of Age)
🇮🇳 India: Jan 26 (Republic), Mar 8 (Holi)
🇦🇺 Australia: Jan 26 (Australia Day)
+ 4 more countries

---

## Troubleshooting

**Bridge won't start?**
```
node --version
→ Install Node.js if not found
```

**Claude doesn't see tools?**
1. Check config file exists
2. Restart Claude Desktop
3. Check bridge running: `netstat -ano | findstr 3000`

**Holiday detection broken?**
```
Test Lambda directly in PowerShell:
$p = @{country1="US"; country2="UK"; preferredTime="09:00"; meetingDate="2026-12-25"} | ConvertTo-Json
Invoke-RestMethod -Uri "https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com/prod/api/tools/getMeetingTime" -Method POST -Body $p -ContentType application/json
```

---

## Status

✅ AWS Lambda: Running
✅ API Gateway: Live
✅ Bridge: Ready  
✅ Claude Config: Created
✅ Holidays: Configured
✅ All Tests: Passed

**You're ready to use Claude Desktop with holiday-aware meeting time suggestions!**

Start: `node bridge.js` → Restart Claude → Test!
