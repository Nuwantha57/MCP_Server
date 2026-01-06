# Claude Desktop Integration Guide

This guide explains how to connect Claude Desktop to your deployed MCP server on Railway.

## Prerequisites

- Node.js installed on your machine
- `@modelcontextprotocol/sdk` package installed
- Claude Desktop installed

## Step 1: Install Dependencies

Run this command to install the MCP SDK:

```powershell
npm install @modelcontextprotocol/sdk
```

Or with yarn:

```bash
yarn add @modelcontextprotocol/sdk
```

## Step 2: Locate Claude Desktop Config

Find your Claude Desktop configuration file:

**Windows:**

```
%APPDATA%\Claude\claude_desktop_config.json
```

**macOS:**

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**

```
~/.config/Claude/claude_desktop_config.json
```

## Step 3: Add Server Configuration

Copy the contents of `claude_desktop_config.json` from this repo into your Claude Desktop config file.

**Important:** Update the path to point to your `server.js`:

```json
{
  "mcpServers": {
    "railway-mcp-server": {
      "command": "node",
      "args": ["C:\\MCP_Server\\server.js"],
      "env": {
        "MCP_SERVER_URL": "https://mcpserver-production-e608.up.railway.app",
        "MCP_API_KEY": "dev-api-key-12345"
      }
    }
  }
}
```

**Note:** Replace:

- `C:\\MCP_Server\\server.js` with the actual path to your `server.js`
- `dev-api-key-12345` with your actual API key if changed

## Step 4: Restart Claude Desktop

1. Close Claude Desktop completely
2. Wait 2 seconds
3. Reopen Claude Desktop
4. Look for the 🔌 icon in the conversation input area - this indicates MCP connections are available

## Step 5: Use the Tools

In Claude Desktop, ask Claude to use your tools:

- "Echo the text 'hello world'"
- "Reverse the text 'programming'"
- "Add 5 and 3"
- "What's the current date and time?"
- "Analyze this text: 'Hello world. This is a test.'"

Claude will automatically call your Railway-deployed tools!

## Troubleshooting

### Server not connecting

- Check that `server.js` path is correct
- Verify Node.js is installed: `node --version`
- Check Claude Desktop logs: `%APPDATA%\Claude\logs\`

### MCP SDK not found

Run:

```powershell
npm install @modelcontextprotocol/sdk
```

### API key errors

- Verify your Railway API key is correct
- Check that your Railway server is running and healthy

### Connection timeout

- Verify your Railway URL is accessible: `https://mcpserver-production-e608.up.railway.app/health`
- Check internet connection

## Testing Without Claude Desktop

You can test the server.js directly:

```powershell
node C:\MCP_Server\server.js
```

The server will listen on stdio for MCP protocol messages.

## Environment Variables

You can customize these via the config:

- `MCP_SERVER_URL` - Your Railway server URL (default: `https://mcpserver-production-e608.up.railway.app`)
- `MCP_API_KEY` - Your API key (default: `dev-api-key-12345`)

## Available Tools

1. **echo** - Echoes back a message
2. **reverse** - Reverses text
3. **add** - Adds two numbers
4. **getDateTime** - Gets current date/time with timezone offset
5. **analyzeText** - Analyzes text and returns statistics

## Next Steps

- Share your Railway URL with others who want to use your tools
- Add more custom tools to `Program.cs` and they'll be available in Claude
- Monitor usage in Railway dashboard
