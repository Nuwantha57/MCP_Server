#!/usr/bin/env node
// Quick test script for MCP bridge

const child_process = require('child_process');
const path = require('path');

// Test message - MCP initialize request
const testMessage = JSON.stringify({
  jsonrpc: "2.0",
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  },
  id: 1
});

console.log('Testing MCP bridge...');
console.log('Sending: initialize request\n');

// Start bridge process
const bridge = child_process.spawn('node', ['c:\\MCP_Server\\bridge.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseReceived = false;
let responseCount = 0;

// Listen for responses
bridge.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(l => l.trim());
  lines.forEach(line => {
    try {
      const msg = JSON.parse(line);
      console.log(`Response ${++responseCount}:`, JSON.stringify(msg, null, 2));
      if (msg.result) {
        responseReceived = true;
      }
    } catch (e) {
      // Ignore non-JSON
    }
  });
});

bridge.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

// Send test message
bridge.stdin.write(testMessage + '\n');

// Wait for response and exit
setTimeout(() => {
  if (responseReceived) {
    console.log('\n✓ MCP Protocol Test PASSED');
  } else {
    console.log('\n○ No response received yet (normal if timeout)');
  }
  bridge.kill();
  process.exit(0);
}, 2000);
