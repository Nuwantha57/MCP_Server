const { spawn } = require('child_process');

const bridge = spawn('node', ['bridge.js'], {
  cwd: 'c:\\MCP_Server',
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

bridge.stdout.on('data', (data) => {
  stdout += data.toString();
});

bridge.stderr.on('data', (data) => {
  stderr += data.toString();
});

// Test: List tools to see if updateCountryHolidays is there
const toolsRequest = {
  jsonrpc: '2.0',
  method: 'tools/list',
  id: 1
};

console.log('Sending tools/list request...');
bridge.stdin.write(JSON.stringify(toolsRequest) + '\n');

setTimeout(() => {
  try {
    const response = JSON.parse(stdout.trim());
    const toolNames = response.result.tools.map(t => t.name);
    console.log('\nTools available:');
    toolNames.forEach(t => console.log(`  - ${t}`));
    
    if (toolNames.includes('updateCountryHolidays')) {
      console.log('\n✓ updateCountryHolidays tool is available!');
    } else {
      console.log('\n✗ updateCountryHolidays tool NOT found');
    }
  } catch (e) {
    console.log('Error parsing response:', e.message);
    console.log('Raw output:', stdout);
  }
  
  bridge.kill();
  process.exit(0);
}, 3000);
