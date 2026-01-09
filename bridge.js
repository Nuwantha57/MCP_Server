const https = require('https');
const url = require('url');

// AWS Lambda API Gateway endpoint
const BASE_URL = 'https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com/prod/api/tools';

// Log startup
console.error('[BRIDGE] Starting MCP bridge server');

// Tool definitions for MCP
const tools = [
  {
    name: 'getMeetingTime',
    description: 'Find optimal meeting time between countries with holiday and timezone detection. Returns time conversions, holiday status, and next available business day. Detects holidays for US, UK, India, Australia, Japan, Germany, France, Singapore, Brazil, and New Zealand.',
    inputSchema: {
      type: 'object',
      properties: {
        country1: { type: 'string', description: 'First country code (e.g., US, UK, INDIA, AU, JP, DE, FR, SG, BR, NZ)' },
        country2: { type: 'string', description: 'Second country code (e.g., US, UK, INDIA, AU, JP, DE, FR, SG, BR, NZ)' },
        preferredTime: { type: 'string', description: 'Preferred time in HH:MM format (24-hour)' },
        meetingDate: { type: 'string', description: 'Meeting date in YYYY-MM-DD format' }
      },
      required: ['country1', 'country2', 'preferredTime', 'meetingDate']
    }
  },
  {
    name: 'echo',
    description: 'Echo back a message',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to echo' }
      },
      required: ['message']
    }
  },
  {
    name: 'add',
    description: 'Add two numbers',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' }
      },
      required: ['a', 'b']
    }
  },
  {
    name: 'reverse',
    description: 'Reverse a text string',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to reverse' }
      },
      required: ['text']
    }
  },
  {
    name: 'getDateTime',
    description: 'Get current date and time in a timezone',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'Timezone name (e.g., America/New_York)' }
      },
      required: ['timezone']
    }
  },
  {
    name: 'analyzeText',
    description: 'Analyze text content',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze' }
      },
      required: ['text']
    }
  }
];

// Send JSON-RPC response
function sendResponse(id, result) {
  const response = {
    jsonrpc: '2.0',
    result: result,
    id: id
  };
  const jsonStr = JSON.stringify(response);
  process.stdout.write(jsonStr + '\n');
  console.error(`[BRIDGE] Sent response for id ${id}`);
}

// Send JSON-RPC error
function sendError(id, code, message) {
  const response = {
    jsonrpc: '2.0',
    error: { 
      code: code, 
      message: message 
    },
    id: id
  };
  const jsonStr = JSON.stringify(response);
  process.stdout.write(jsonStr + '\n');
  console.error(`[BRIDGE] Sent error for id ${id}: ${message}`);
}

// Call Lambda function
async function callLambda(tool, args) {
  return new Promise((resolve, reject) => {
    const lambdaUrl = `${BASE_URL}/${tool}`;
    const options = new url.URL(lambdaUrl);
    const body = JSON.stringify(args);
    
    const httpsReq = https.request(options, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length
      }
    }, (lambdaRes) => {
      let data = '';
      lambdaRes.on('data', chunk => data += chunk);
      lambdaRes.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          resolve({ result: data });
        }
      });
    });
    
    httpsReq.on('error', reject);
    httpsReq.write(body);
    httpsReq.end();
  });
}

// Buffer for stdin data
let buffer = '';

// Process stdin directly
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => {
  console.error(`[BRIDGE] Received ${chunk.length} bytes`);
  buffer += chunk;
  
  // Process complete lines
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      handleLine(line);
    }
  }
});

async function handleLine(line) {
  try {
    const message = JSON.parse(line);
    
    // Validate message
    if (message.id === undefined || message.id === null) {
      console.error(`[BRIDGE] Ignoring message with no id`);
      return;
    }
    
    if (!message.method) {
      console.error(`[BRIDGE] Ignoring message with no method`);
      return;
    }
    
    console.error(`[BRIDGE] Processing ${message.method} (id: ${message.id})`);
    
    if (message.method === 'initialize') {
      sendResponse(message.id, {
        protocolVersion: '2025-06-18',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'mcp-lambda-server',
          version: '1.0.0'
        }
      });
    } else if (message.method === 'tools/list') {
      sendResponse(message.id, {
        tools: tools
      });
    } else if (message.method === 'tools/call') {
      try {
        const { name, arguments: args } = message.params;
        if (!name) {
          sendError(message.id, -32602, 'Missing tool name in params');
          return;
        }
        console.error(`[BRIDGE] Calling Lambda: ${name} with args: ${JSON.stringify(args)}`);
        const lambdaResult = await callLambda(name, args);
        console.error(`[BRIDGE] Lambda returned: ${Object.keys(lambdaResult).join(', ')}`);
        
        // Send Lambda result directly as array of content blocks for MCP
        const resultContent = [
          {
            type: 'text',
            text: JSON.stringify(lambdaResult, null, 2)
          }
        ];
        
        sendResponse(message.id, { content: resultContent });
      } catch (error) {
        console.error(`[BRIDGE] Tool error: ${error.message}`);
        sendError(message.id, -32603, `Error calling tool: ${error.message}`);
      }
    } else {
      sendError(message.id, -32601, 'Method not found');
    }
  } catch (error) {
    console.error(`[BRIDGE] Parse error: ${error.message}`);
  }
}

process.stdin.on('end', () => {
  console.error('[BRIDGE] stdin closed');
  process.exit(0);
});

process.stdin.on('error', (error) => {
  console.error(`[BRIDGE] stdin error: ${error.message}`);
  process.exit(1);
});

// Handle termination
process.on('SIGINT', () => {
  console.error('[BRIDGE] SIGINT received');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[BRIDGE] SIGTERM received');
  process.exit(0);
});
