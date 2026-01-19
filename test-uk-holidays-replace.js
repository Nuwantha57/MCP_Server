const https = require('https');
const crypto = require('crypto');

// Load credentials from environment
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const LAMBDA_FUNCTION_NAME = 'mcp-server-function';

console.log('Testing UK Holidays Update - REPLACE MODE\n');
console.log('AWS Access Key:', AWS_ACCESS_KEY_ID ? AWS_ACCESS_KEY_ID.substring(0, 8) + '...' : 'NOT SET');
console.log('AWS Region:', AWS_REGION);
console.log('');

// Test data - UK holiday (single period for 2026)
const country = 'UK';
const holidays = [
  {
    startDate: '2026-12-24',
    endDate: '2026-12-28',
    timezone: '+00:00'
  }
];

const host = `lambda.${AWS_REGION}.amazonaws.com`;
const pathStr = `/2015-03-31/functions/${LAMBDA_FUNCTION_NAME}/configuration`;
const amzDate = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
const dateStamp = amzDate.split('T')[0];
const method = 'PUT';
const service = 'lambda';

// Build holiday JSON entries
const holidayEntries = holidays.map(h => ({
  start: `${h.startDate}T00:00${h.timezone}`,
  end: `${h.endDate}T23:59${h.timezone}`
}));

const bodyObj = {
  Environment: {
    Variables: {
      [`HOLIDAYS_${country}`]: JSON.stringify(holidayEntries)
    }
  }
};

const body = JSON.stringify(bodyObj);
console.log('Request Body:');
console.log(body);
console.log('');

const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

// Build canonical request
const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
const canonicalRequest = `${method}\n${pathStr}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

// Build string to sign
const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

// Calculate signature
const kDate = crypto.createHmac('sha256', `AWS4${AWS_SECRET_ACCESS_KEY}`).update(dateStamp).digest();
const kRegion = crypto.createHmac('sha256', kDate).update(AWS_REGION).digest();
const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

const options = {
  hostname: host,
  path: pathStr,
  method: method,
  headers: {
    'Content-Type': 'application/x-amz-json-1.1',
    'Content-Length': body.length,
    'Host': host,
    'X-Amz-Date': amzDate,
    'X-Amz-Content-Sha256': payloadHash,
    'Authorization': authorizationHeader
  }
};

console.log('Sending REPLACE request to AWS Lambda...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`\nResponse Status: ${res.statusCode}`);
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const result = JSON.parse(data);
        const envVars = result.Environment?.Variables || {};
        console.log('\n✅ SUCCESS - UK Holidays Updated (REPLACE MODE)');
        console.log('Applied Value:', envVars.HOLIDAYS_UK);
        console.log('\nParsed Holidays:');
        console.log(JSON.stringify(JSON.parse(envVars.HOLIDAYS_UK || '[]'), null, 2));
      } catch (e) {
        console.log(data);
      }
    } else {
      console.log('❌ ERROR:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error.message);
});

req.write(body);
req.end();
