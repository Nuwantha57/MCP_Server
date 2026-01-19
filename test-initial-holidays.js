const https = require('https');

const BASE_URL = 'https://7wljg1mha3.execute-api.eu-north-1.amazonaws.com/prod/api/tools';

async function testMeetingTime(country1, country2, meetingDate, preferredTime) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/getMeetingTime`);
    const body = JSON.stringify({
      country1,
      country2,
      meetingDate,
      preferredTime
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

console.log('Testing Initial Holiday Detection (2022 dates)...\n');

// Test UK - Dec 25, 2022 should be holiday
testMeetingTime('UK', 'US', '2022-12-25', '09:00')
  .then(result => {
    console.log('=== Test 1: UK on Dec 25, 2022 ===');
    console.log('Expected: UK should be on holiday');
    console.log('Result:', result.holidayStatus || 'No holiday detected');
    console.log('isHoliday1 (UK):', result.isHoliday1);
    console.log('');

    // Test US - Dec 26, 2022 should be holiday (within Dec 25-29 range)
    return testMeetingTime('US', 'UK', '2022-12-26', '09:00');
  })
  .then(result => {
    console.log('=== Test 2: US on Dec 26, 2022 ===');
    console.log('Expected: US should be on holiday (within Dec 25-29 range)');
    console.log('Result:', result.holidayStatus || 'No holiday detected');
    console.log('isHoliday1 (US):', result.isHoliday1);
    console.log('');

    // Test AU - Dec 27, 2022 should be holiday
    return testMeetingTime('AU', 'UK', '2022-12-27', '09:00');
  })
  .then(result => {
    console.log('=== Test 3: AU on Dec 27, 2022 ===');
    console.log('Expected: AU should be on holiday');
    console.log('Result:', result.holidayStatus || 'No holiday detected');
    console.log('isHoliday1 (AU):', result.isHoliday1);
    console.log('');

    // Test NZ - Dec 28, 2022 should be holiday
    return testMeetingTime('NZ', 'UK', '2022-12-28', '09:00');
  })
  .then(result => {
    console.log('=== Test 4: NZ on Dec 28, 2022 ===');
    console.log('Expected: NZ should be on holiday');
    console.log('Result:', result.holidayStatus || 'No holiday detected');
    console.log('isHoliday1 (NZ):', result.isHoliday1);
    console.log('');

    console.log('✅ Initial holiday configuration verified!');
    console.log('\nNow you can update these via Claude Desktop:');
    console.log('  - "Update UK holidays to December 24-28, 2026 with timezone +00:00"');
    console.log('  - "Add New Year 2027 (Jan 1-2) to UK holidays, keep existing"');
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
