const { spawn } = require('child_process');

const bridge = spawn('node', ['bridge.js'], {
  cwd: 'c:\\MCP_Server',
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env
});

let stdout = '';
let stderr = '';

bridge.stdout.on('data', (data) => {
  stdout += data.toString();
  console.log('OUT:', data.toString().trim());
});

bridge.stderr.on('data', (data) => {
  stderr += data.toString();
  console.log('ERR:', data.toString().trim());
});

// Send update request
const updateRequest = {
  jsonrpc: '2.0',
  method: 'tools/call',
  params: {
    name: 'updateCountryHolidays',
    arguments: {
      country: 'US',
      startDate: '2026-12-20',
      endDate: '2026-12-22',
      timezone: '-05:00'
    }
  },
  id: 3
};

console.log('Sending update request...\n');
bridge.stdin.write(JSON.stringify(updateRequest) + '\n');

setTimeout(() => {
  console.log('\n=== TEST COMPLETE ===');
  if (stdout.includes('success')) {
    console.log('✓ Response received');
  } else {
    console.log('✗ No success response');
  }
  bridge.kill();
  process.exit(0);
}, 10000);
