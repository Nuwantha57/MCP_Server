// Test the updateCountryHolidays tool with simple format (backward compatible)
const message = {
  jsonrpc: '2.0',
  id: 1,
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

console.log('Testing simple format for updateCountryHolidays...');
console.log('Sending:', JSON.stringify(message));
console.log('');

// This mimics what Claude Desktop would send
process.stdout.write(JSON.stringify(message) + '\n');

// Wait for response
setTimeout(() => {
  console.log('\nTest completed. Check bridge logs for response.');
  process.exit(0);
}, 5000);
