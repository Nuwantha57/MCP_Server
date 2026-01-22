const https = require('https');
const url = require('url');
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// AWS Lambda API Gateway endpoint
const BASE_URL = 'https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com/prod/api/tools';
const SCRIPT_DIR = path.dirname(require.main.filename || __filename);
const LAMBDA_FUNCTION_NAME = 'mcp-server-function';

// Log startup
console.error('[BRIDGE] Starting MCP bridge server');

// Load AWS credentials from environment variables ONLY (secure approach)
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.error('[BRIDGE] WARNING: AWS credentials not found in environment variables');
  console.error('[BRIDGE] Holiday update feature will not work');
  console.error('[BRIDGE] Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables');
}

console.error(`[BRIDGE] AWS Region: ${AWS_REGION}`);
console.error(`[BRIDGE] AWS Access Key: ${AWS_ACCESS_KEY_ID ? AWS_ACCESS_KEY_ID.substring(0, 8) + '...' : 'NOT SET'}`);

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
  },
  {
    name: 'updateCountryHolidays',
    description: 'Update holiday dates for a specific country in the Lambda environment. Supports single period (startDate/endDate/timezone) or multiple periods (holidays array). Use "append" mode to add holidays without removing existing ones.',
    inputSchema: {
      type: 'object',
      properties: {
        country: { type: 'string', description: 'Country code (US, UK, INDIA, AU, JP, DE, FR, SG, BR, NZ)' },
        startDate: { type: 'string', description: 'Holiday start date (YYYY-MM-DD) - for single period' },
        endDate: { type: 'string', description: 'Holiday end date (YYYY-MM-DD) - for single period' },
        timezone: { type: 'string', description: 'Timezone offset (e.g., +00:00, -05:00, +13:00) - for single period' },
        holidays: {
          type: 'array',
          description: 'Array of holiday periods (alternative to startDate/endDate/timezone)',
          items: {
            type: 'object',
            properties: {
              startDate: { type: 'string', description: 'Holiday start date (YYYY-MM-DD)' },
              endDate: { type: 'string', description: 'Holiday end date (YYYY-MM-DD)' },
              timezone: { type: 'string', description: 'Timezone offset (e.g., +00:00, -05:00, +13:00)' }
            },
            required: ['startDate', 'endDate', 'timezone']
          }
        },
        mode: { type: 'string', enum: ['replace', 'append'], description: 'Replace all holidays or append to existing. Default: replace' }
      },
      required: ['country']
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

// Get current Lambda configuration
async function getCurrentLambdaConfig() {
  return new Promise((resolve, reject) => {
    const host = `lambda.${AWS_REGION}.amazonaws.com`;
    const pathStr = `/2015-03-31/functions/${LAMBDA_FUNCTION_NAME}/configuration`;
    const method = 'GET';
    const service = 'lambda';
    const amzDate = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    const dateStamp = amzDate.split('T')[0];
    const payloadHash = crypto.createHash('sha256').update('').digest('hex');

    // Build canonical request
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `${method}\n${pathStr}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

    // Build string to sign
    const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

    // Calculate signature
    const kDate = crypto.createHmac('sha256', `AWS4${AWS_SECRET_ACCESS_KEY}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(AWS_REGION).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const options = {
      hostname: host,
      path: pathStr,
      method: method,
      headers: {
        'Host': host,
        'X-Amz-Date': amzDate,
        'X-Amz-Content-Sha256': payloadHash,
        'Authorization': authorizationHeader
      },
      timeout: 10000  // 10 second timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse Lambda config'));
          }
        } else {
          reject(new Error(`AWS error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`[BRIDGE] Error fetching config: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      console.error(`[BRIDGE] Timeout fetching config`);
      req.destroy();
      reject(new Error('Timeout fetching Lambda config'));
    });

    req.end();
  });
}

// Update Lambda environment variables with AWS SigV4 signing
async function updateLambdaEnvironment(country, holidays, mode = 'replace') {
  return new Promise(async (resolve, reject) => {
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      reject(new Error('AWS credentials not configured'));
      return;
    }

    const host = `lambda.${AWS_REGION}.amazonaws.com`;
    const pathStr = `/2015-03-31/functions/${LAMBDA_FUNCTION_NAME}/configuration`;
    const method = 'PUT';
    const service = 'lambda';
    
    // CRITICAL: Fetch ALL existing environment variables first
    // AWS Lambda PUT replaces ALL variables, so we must preserve them
    let allEnvVars = {};
    try {
      console.error(`[BRIDGE] Fetching all existing environment variables...`);
      const existing = await getCurrentLambdaConfig();
      allEnvVars = existing.Environment?.Variables || {};
      console.error(`[BRIDGE] Found ${Object.keys(allEnvVars).length} existing env vars`);
    } catch (e) {
      console.error(`[BRIDGE] Warning: Could not fetch existing env vars: ${e.message}`);
      console.error(`[BRIDGE] Proceeding anyway - other country holidays may be lost`);
    }
    
    // Build holiday JSON entries from array
    const holidayEntries = holidays.map(h => ({
      start: `${h.startDate}T00:00${h.timezone}`,
      end: `${h.endDate}T23:59${h.timezone}`
    }));
    
    let finalHolidays = holidayEntries;
    
    // If append mode, merge with existing holidays for THIS country
    if (mode === 'append') {
      const existingHolidaysStr = allEnvVars[`HOLIDAYS_${country}`];
      if (existingHolidaysStr) {
        try {
          const existingHolidays = JSON.parse(existingHolidaysStr);
          finalHolidays = [...existingHolidays, ...holidayEntries];
          console.error(`[BRIDGE] Appending ${holidayEntries.length} holidays to ${existingHolidays.length} existing for ${country}`);
        } catch (e) {
          console.error(`[BRIDGE] Could not parse existing holidays for ${country}: ${e.message}`);
        }
      }
    }
    
    // Update ONLY this country's holidays in the full env vars object
    allEnvVars[`HOLIDAYS_${country}`] = JSON.stringify(finalHolidays);
    
    const amzDate = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    const dateStamp = amzDate.split('T')[0];
    
    // Send ALL environment variables back (not just the one being updated)
    const bodyObj = {
      Environment: {
        Variables: allEnvVars
      }
    };
    
    const body = JSON.stringify(bodyObj);
    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

    console.error(`[BRIDGE] AWS SigV4: Updating Lambda with ${country} holidays`);
    
    // Build canonical request
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `${method}\n${pathStr}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

    // Build string to sign
    const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

    // Calculate signature
    const kDate = crypto.createHmac('sha256', `AWS4${AWS_SECRET_ACCESS_KEY}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(AWS_REGION).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const options = {
      hostname: host,
      path: pathStr,
      method: method,
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'Content-Length': body.length,
        'Host': host,
        'X-Amz-Date': amzDate,
        'X-Amz-Content-Sha256': payloadHash,
        'Authorization': authorizationHeader
      },
      timeout: 15000  // 15 second timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.error(`[BRIDGE] AWS Response: ${res.statusCode}`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(data);
            console.error(`[BRIDGE] Update successful`);
            
            // Check if environment variables were updated
            const envVars = result.Environment?.Variables || {};
            const holidayKey = `HOLIDAYS_${country}`;
            const updatedValue = envVars[holidayKey];
            
            resolve({
              success: true,
              message: `✅ Holiday dates successfully updated for ${country}`,
              details: `${mode === 'append' ? 'Added' : 'Replaced'} ${finalHolidays.length} holiday period(s) for ${country}`,
              country: country,
              holidayCount: finalHolidays.length,
              holidays: finalHolidays,
              mode: mode,
              appliedValue: updatedValue,
              status: result.LastUpdateStatus || 'Applied',
              note: 'Changes may take a few seconds to propagate'
            });
          } catch (e) {
            resolve({
              success: true,
              message: `✅ Holiday dates successfully updated for ${country}`,
              details: `${mode === 'append' ? 'Added' : 'Replaced'} ${finalHolidays.length} holiday period(s) for ${country}`,
              country: country,
              holidayCount: finalHolidays.length,
              holidays: finalHolidays,
              mode: mode,
              note: 'Changes may take a few seconds to propagate'
            });
          }
        } else {
          console.error(`[BRIDGE] AWS error ${res.statusCode}: ${data}`);
          const errorMsg = `AWS Lambda API returned ${res.statusCode}. Check IAM permissions (lambda:UpdateFunctionConfiguration required)`;
          reject(new Error(errorMsg));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`[BRIDGE] Request error: ${error.message}`);
      const errorMsg = `Network error connecting to AWS Lambda API: ${error.message}. Check internet connectivity and AWS region.`;
      reject(new Error(errorMsg));
    });

    req.on('timeout', () => {
      console.error(`[BRIDGE] Request timeout`);
      req.destroy();
      reject(new Error('AWS Lambda API request timed out after 15 seconds'));
    });

    req.write(body);
    req.end();
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
        
        // Special handling for updateCountryHolidays
        if (name === 'updateCountryHolidays') {
          console.error(`[BRIDGE] Updating country holidays: ${args.country}`);
          try {
            // Support both formats:
            // 1. Simple: { country, startDate, endDate, timezone, mode }
            // 2. Array: { country, holidays: [{startDate, endDate, timezone}], mode }
            let holidays;
            
            if (args.holidays && Array.isArray(args.holidays)) {
              // New array format
              holidays = args.holidays;
              console.error(`[BRIDGE] Using array format with ${holidays.length} period(s)`);
            } else if (args.startDate && args.timezone) {
              // Old simple format - convert to array
              holidays = [{
                startDate: args.startDate,
                endDate: args.endDate || args.startDate,
                timezone: args.timezone
              }];
              console.error(`[BRIDGE] Converting simple format to array`);
            } else {
              throw new Error('Invalid parameters: provide either (startDate, endDate, timezone) or (holidays array)');
            }
            
            const result = await updateLambdaEnvironment(
              args.country,
              holidays,
              args.mode || 'replace'
            );
            const resultContent = [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ];
            sendResponse(message.id, { content: resultContent });
          } catch (error) {
            console.error(`[BRIDGE] Holiday update error: ${error.message}`);
            sendError(message.id, -32603, `Error updating holidays: ${error.message}`);
          }
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
