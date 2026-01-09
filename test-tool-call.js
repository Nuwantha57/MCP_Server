const { spawn } = require('child_process');

const bridge = spawn('node', ['bridge.js'], {
  cwd: 'c:\\MCP_Server',
  stdio: ['pipe', 'pipe', 'pipe']
});

bridge.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString().trim());
});

bridge.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString().trim());
});

// Send tools/call request
const toolRequest = {
  jsonrpc: '2.0',
  method: 'tools/call',
  params: {
    name: 'getMeetingTime',
    arguments: {
      country1: 'US',
      country2: 'UK',
      meetingDate: '2026-12-25',
      preferredTime: '09:00'
    }
  },
  id: 2
};

console.log('Sending tool call...');
bridge.stdin.write(JSON.stringify(toolRequest) + '\n');

setTimeout(() => {
  console.log('\nTest complete.');
  bridge.kill();
  process.exit(0);
}, 15000);
