const { spawn } = require('child_process');
const path = require('path');

console.log('=== Simulating Claude Desktop Tool Call ===\n');

// Start the bridge as Claude Desktop would
const bridge = spawn('node', [path.join(__dirname, 'bridge.js')], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env
});

let responseBuffer = '';
let initializeReceived = false;
let toolsListReceived = false;

bridge.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  // Process complete JSON-RPC messages
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop(); // Keep incomplete line
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('\n📨 Received from bridge:');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.result && response.result.protocolVersion && !initializeReceived) {
          initializeReceived = true;
          console.log('\n✅ Initialize successful, requesting tools list...');
          
          // Request tools list
          const toolsListMsg = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list'
          };
          bridge.stdin.write(JSON.stringify(toolsListMsg) + '\n');
          
        } else if (response.result && response.result.tools && !toolsListReceived) {
          toolsListReceived = true;
          console.log('\n✅ Tools list received');
          console.log('Available tools:', response.result.tools.map(t => t.name).join(', '));
          
          const updateTool = response.result.tools.find(t => t.name === 'updateCountryHolidays');
          if (updateTool) {
            console.log('\n✅ updateCountryHolidays tool found');
            console.log('Schema:', JSON.stringify(updateTool.inputSchema, null, 2));
          }
          
          console.log('\n🔧 Calling updateCountryHolidays tool...');
          
          // Call the tool with simple format
          const toolCallMsg = {
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              name: 'updateCountryHolidays',
              arguments: {
                country: 'UK',
                startDate: '2026-12-20',
                endDate: '2026-12-25',
                timezone: '+00:00',
                mode: 'replace'
              }
            }
          };
          bridge.stdin.write(JSON.stringify(toolCallMsg) + '\n');
          
        } else if (response.result && response.result.content) {
          console.log('\n✅ Tool execution completed!');
          console.log('Result:', response.result.content[0].text);
          
          // Success - exit
          setTimeout(() => {
            console.log('\n✅ All tests passed! Bridge is working correctly.');
            bridge.kill();
            process.exit(0);
          }, 1000);
          
        } else if (response.error) {
          console.error('\n❌ Error from bridge:', response.error.message);
          bridge.kill();
          process.exit(1);
        }
      } catch (e) {
        console.error('Failed to parse response:', line);
      }
    }
  }
});

bridge.stderr.on('data', (data) => {
  console.log('[BRIDGE LOG]', data.toString().trim());
});

bridge.on('error', (error) => {
  console.error('\n❌ Failed to start bridge:', error.message);
  process.exit(1);
});

bridge.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\n❌ Bridge exited with code ${code}`);
    process.exit(code);
  }
});

// Send initialize message
console.log('📤 Sending initialize message...');
const initMsg = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};
bridge.stdin.write(JSON.stringify(initMsg) + '\n');

// Timeout after 30 seconds
setTimeout(() => {
  console.error('\n❌ Test timeout - bridge did not respond in 30 seconds');
  bridge.kill();
  process.exit(1);
}, 30000);
