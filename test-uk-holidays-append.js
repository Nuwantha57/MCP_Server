const https = require('https');
const crypto = require('crypto');

// Load credentials from environment
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const LAMBDA_FUNCTION_NAME = 'mcp-server-function';

console.log('Testing UK Holidays Update - APPEND MODE\n');
console.log('AWS Access Key:', AWS_ACCESS_KEY_ID ? AWS_ACCESS_KEY_ID.substring(0, 8) + '...' : 'NOT SET');
console.log('AWS Region:', AWS_REGION);
console.log('');

// Step 1: Get current Lambda configuration
async function getCurrentConfig() {
  return new Promise((resolve, reject) => {
    const host = `lambda.${AWS_REGION}.amazonaws.com`;
    const pathStr = `/2015-03-31/functions/${LAMBDA_FUNCTION_NAME}/configuration`;
    const method = 'GET';
    const service = 'lambda';
    const amzDate = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    const dateStamp = amzDate.split('T')[0];
    const payloadHash = crypto.createHash('sha256').update('').digest('hex');

    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `${method}\n${pathStr}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

    const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

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
        'Host': host,
        'X-Amz-Date': amzDate,
        'X-Amz-Content-Sha256': payloadHash,
        'Authorization': authorizationHeader
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`AWS error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Step 2: Update with appended holidays
async function updateHolidays(existingHolidays) {
  return new Promise((resolve, reject) => {
    const country = 'UK';
    
    // New holiday to append (Easter 2026)
    const newHolidays = [
      {
        start: '2026-04-03T00:00+00:00',
        end: '2026-04-06T23:59+00:00'
      }
    ];
    
    // Combine existing + new
    const allHolidays = [...existingHolidays, ...newHolidays];
    
    console.log('Existing holidays:', existingHolidays.length);
    console.log('New holidays to add:', newHolidays.length);
    console.log('Total after append:', allHolidays.length);
    console.log('');

    const host = `lambda.${AWS_REGION}.amazonaws.com`;
    const pathStr = `/2015-03-31/functions/${LAMBDA_FUNCTION_NAME}/configuration`;
    const amzDate = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    const dateStamp = amzDate.split('T')[0];
    const method = 'PUT';
    const service = 'lambda';

    const bodyObj = {
      Environment: {
        Variables: {
          [`HOLIDAYS_${country}`]: JSON.stringify(allHolidays)
        }
      }
    };

    const body = JSON.stringify(bodyObj);
    console.log('Request Body:');
    console.log(body);
    console.log('');

    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `${method}\n${pathStr}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

    const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

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

    console.log('Sending APPEND request to AWS Lambda...');

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\nResponse Status: ${res.statusCode}`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(data);
            const envVars = result.Environment?.Variables || {};
            console.log('\n✅ SUCCESS - UK Holidays Updated (APPEND MODE)');
            console.log('Applied Value:', envVars.HOLIDAYS_UK);
            console.log('\nParsed Holidays:');
            console.log(JSON.stringify(JSON.parse(envVars.HOLIDAYS_UK || '[]'), null, 2));
            resolve();
          } catch (e) {
            console.log(data);
            resolve();
          }
        } else {
          console.log('❌ ERROR:', data);
          reject(new Error(data));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Execute
(async () => {
  try {
    const config = await getCurrentConfig();
    const existingHolidaysStr = config.Environment?.Variables?.HOLIDAYS_UK;
    const existingHolidays = existingHolidaysStr ? JSON.parse(existingHolidaysStr) : [];
    
    console.log('Current UK Holidays:');
    console.log(JSON.stringify(existingHolidays, null, 2));
    console.log('');
    
    await updateHolidays(existingHolidays);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
