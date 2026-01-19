const { spawn } = require('child_process');

const bridge = spawn('node', ['bridge.js'], {
  cwd: 'c:\\MCP_Server',
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

bridge.stdout.on('data', (data) => {
  stdout += data.toString();
  if (data.toString().includes('success')) {
    console.log('✓ Response:', data.toString().substring(0, 100));
  }
});

bridge.stderr.on('data', (data) => {
  stderr += data.toString();
  if (data.toString().includes('AWS')) {
    console.log('LOG:', data.toString().trim());
  }
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
  id: 4
};

console.log('Testing holiday update with credentials from config file...\n');
bridge.stdin.write(JSON.stringify(updateRequest) + '\n');

setTimeout(() => {
  console.log('\n=== RESULT ===');
  if (stdout.includes('"success": true')) {
    console.log('✓ UPDATE SUCCESS!');
  } else if (stdout.includes('success')) {
    console.log('Response received');
  } else {
    console.log('✗ No success response');
  }
  bridge.kill();
  process.exit(0);
}, 10000);
