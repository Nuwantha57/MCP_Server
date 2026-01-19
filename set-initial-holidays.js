const https = require('https');
const crypto = require('crypto');

// Load credentials from environment
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const LAMBDA_FUNCTION_NAME = 'mcp-server-function';

console.log('Setting Initial Holiday Environment Variables\n');
console.log('AWS Access Key:', AWS_ACCESS_KEY_ID ? AWS_ACCESS_KEY_ID.substring(0, 8) + '...' : 'NOT SET');
console.log('AWS Region:', AWS_REGION);
console.log('');

// Initial holiday data - exactly as provided
const holidays = {
  UK: [
    {
      start: '2022-12-25T05:00+13:00',
      end: '2022-12-28T18:00+13:00'
    }
  ],
  US: [
    {
      start: '2022-12-25T12:30+13:00',
      end: '2022-12-29T00:00+13:00'
    }
  ],
  AU: [
    {
      start: '2022-12-25T00:00+13:00',
      end: '2022-12-28T07:00+13:00'
    }
  ],
  NZ: [
    {
      start: '2022-12-25T00:00+13:00',
      end: '2022-12-28T07:00+13:00'
    }
  ]
};

console.log('Holiday Data to Set:');
console.log(JSON.stringify(holidays, null, 2));
console.log('');

const host = `lambda.${AWS_REGION}.amazonaws.com`;
const pathStr = `/2015-03-31/functions/${LAMBDA_FUNCTION_NAME}/configuration`;
const amzDate = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
const dateStamp = amzDate.split('T')[0];
const method = 'PUT';
const service = 'lambda';

// Build environment variables object with all countries
const envVariables = {};
for (const [country, periods] of Object.entries(holidays)) {
  envVariables[`HOLIDAYS_${country}`] = JSON.stringify(periods);
}

const bodyObj = {
  Environment: {
    Variables: envVariables
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

console.log('Sending request to AWS Lambda...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`\nResponse Status: ${res.statusCode}`);
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const result = JSON.parse(data);
        const envVars = result.Environment?.Variables || {};
        
        console.log('\n✅ SUCCESS - Initial Holidays Set for All Countries\n');
        
        // Display each country's holidays
        for (const country of ['UK', 'US', 'AU', 'NZ']) {
          const key = `HOLIDAYS_${country}`;
          if (envVars[key]) {
            console.log(`${country}:`);
            const parsed = JSON.parse(envVars[key]);
            console.log(JSON.stringify(parsed, null, 2));
            console.log('');
          }
        }
        
        console.log('\n✅ Environment variables are now set in Lambda');
        console.log('✅ You can now update them via Claude Desktop');
        console.log('\nExample prompts:');
        console.log('  - "Update UK holidays to December 24-28, 2026 with timezone +00:00"');
        console.log('  - "Add Easter 2026 (April 3-6) to UK holidays, keep existing"');
        
      } catch (e) {
        console.log('✅ SUCCESS - Response:', data.substring(0, 200));
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
