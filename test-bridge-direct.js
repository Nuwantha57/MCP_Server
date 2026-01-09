const { spawn } = require('child_process');

console.log('Starting bridge test...');
const bridge = spawn('node', ['bridge.js'], {
  cwd: 'c:\\MCP_Server',
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseData = '';
let stderrData = '';

bridge.stdout.on('data', (data) => {
  responseData += data.toString();
  console.log('STDOUT:', data.toString());
});

bridge.stderr.on('data', (data) => {
  stderrData += data.toString();
  console.log('STDERR:', data.toString());
});

bridge.on('error', (error) => {
  console.error('Bridge error:', error);
});

// Send initialize request
const initRequest = {
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0' }
  },
  id: 1
};

console.log('Sending:', JSON.stringify(initRequest));
bridge.stdin.write(JSON.stringify(initRequest) + '\n');

// Wait for response
setTimeout(() => {
  console.log('\n=== RESULTS ===');
  console.log('Response received:', responseData ? 'YES' : 'NO');
  if (responseData) {
    try {
      const parsed = JSON.parse(responseData.trim());
      console.log('Response valid JSON:', true);
      console.log('Response ID:', parsed.id);
      console.log('Protocol version:', parsed.result?.protocolVersion);
    } catch (e) {
      console.log('Response valid JSON:', false);
      console.log('Error:', e.message);
    }
  }
  bridge.kill();
  process.exit(0);
}, 2000);
