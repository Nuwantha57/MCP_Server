#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'https://mcpserver-production-e608.up.railway.app';
const MCP_API_KEY = process.env.MCP_API_KEY || 'dev-api-key-12345';

const server = new Server(
  {
    name: 'Railway MCP Server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

async function callTool(toolName, args) {
  console.error(`[CALL] ${toolName} with args:`, JSON.stringify(args));
  
  try {
    const url = `${MCP_SERVER_URL}/api/tools/${toolName}`;
    console.error(`[HTTP] POST ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': MCP_API_KEY,
      },
      body: JSON.stringify(args || {}),
    });
    
    console.error(`[RESPONSE] Status: ${response.status}`);
    const data = await response.json();
    console.error(`[DATA] ${JSON.stringify(data)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data?.error || 'Unknown error'}`);
    }
    
    return data;
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    throw error;
  }
}

const tools = [
  {
    name: 'echo',
    description: 'Echoes back a message',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  },
  {
    name: 'reverse',
    description: 'Reverses text',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
  },
  {
    name: 'add',
    description: 'Adds two numbers',
    inputSchema: {
      type: 'object',
      properties: { a: { type: 'integer' }, b: { type: 'integer' } },
      required: ['a', 'b'],
    },
  },
  {
    name: 'getDateTime',
    description: 'Gets current date and time',
    inputSchema: {
      type: 'object',
      properties: { offsetHours: { type: 'integer' } },
    },
  },
  {
    name: 'analyzeText',
    description: 'Analyzes text',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
  },
  {
    name: 'getMeetingTime',
    description: 'Finds optimal meeting time for people in two different countries based on their timezones',
    inputSchema: {
      type: 'object',
      properties: {
        country1: {
          type: 'string',
          description: 'First country name or timezone (e.g., US, India, America/New_York)'
        },
        country2: {
          type: 'string',
          description: 'Second country name or timezone (e.g., UK, Japan, Europe/London)'
        },
        preferredTime: {
          type: 'string',
          description: 'Preferred time in country1 in 24-hour format (e.g., 14:00). Optional.'
        },
        meetingDate: {
          type: 'string',
          description: 'Date for the meeting in YYYY-MM-DD format (e.g., 2026-10-02). Optional, defaults to today.'
        }
      },
      required: ['country1', 'country2'],
    },
  },
];

// Register tools/list handler with SDK schema
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('[HANDLER] tools/list');
  return { tools };
});

// Register tools/call handler with SDK schema
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`[HANDLER] tools/call: ${name}`);
  
  try {
    const result = await callTool(name, args || {});
    console.error(`[SUCCESS] Tool returned:`, JSON.stringify(result));
    
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error(`[FAILED] ${name}: ${error.message}`);
    return {
      content: [
        {
          type: 'text',
          text: `Tool failed: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  console.error('[START] MCP Server initializing...');
  console.error(`[CONFIG] MCP_SERVER_URL=${MCP_SERVER_URL}`);
  console.error(`[CONFIG] MCP_API_KEY=${MCP_API_KEY.substring(0, 10)}...`);
  
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[READY] MCP Server connected to Claude Desktop');
  } catch (error) {
    console.error(`[FATAL] ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
