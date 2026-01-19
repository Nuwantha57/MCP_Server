const https = require('https');

// Test getMeetingTime with the new US holiday dates (Dec 20-28, 2026)
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
          const result = JSON.parse(data);
          resolve(result);
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

console.log('Testing getMeetingTime with updated US holidays (Dec 20-28, 2026)...\n');

// Test 1: December 21, 2026 (should be detected as US holiday now)
testMeetingTime('US', 'UK', '2026-12-21', '09:00')
  .then(result => {
    console.log('=== Test 1: December 21, 2026 (US should be on holiday) ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n');

    // Test 2: December 25, 2026 (traditional Christmas - both should be holidays)
    return testMeetingTime('US', 'UK', '2026-12-25', '09:00');
  })
  .then(result => {
    console.log('=== Test 2: December 25, 2026 (Both should be on holiday) ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n');

    // Test 3: December 29, 2026 (after holiday period - should be available)
    return testMeetingTime('US', 'UK', '2026-12-29', '09:00');
  })
  .then(result => {
    console.log('=== Test 3: December 29, 2026 (Should be available) ===');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
