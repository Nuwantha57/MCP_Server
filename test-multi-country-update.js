const https = require('https');
const crypto = require('crypto');

// Load credentials from environment
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const LAMBDA_FUNCTION_NAME = 'mcp-server-function';

console.log('Testing Multi-Country Holiday Updates\n');
console.log('AWS Access Key:', AWS_ACCESS_KEY_ID ? AWS_ACCESS_KEY_ID.substring(0, 8) + '...' : 'NOT SET');
console.log('AWS Region:', AWS_REGION);
console.log('');

// Helper to get current config
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

// Helper to update country
async function updateCountry(country, startDate, endDate, timezone, allEnvVars) {
  return new Promise((resolve, reject) => {
    const holidays = [{
      start: `${startDate}T00:00${timezone}`,
      end: `${endDate}T23:59${timezone}`
    }];
    
    // Update this country in all env vars
    allEnvVars[`HOLIDAYS_${country}`] = JSON.stringify(holidays);
    
    const host = `lambda.${AWS_REGION}.amazonaws.com`;
    const pathStr = `/2015-03-31/functions/${LAMBDA_FUNCTION_NAME}/configuration`;
    const method = 'PUT';
    const service = 'lambda';
    const amzDate = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    const dateStamp = amzDate.split('T')[0];

    const bodyObj = {
      Environment: {
        Variables: allEnvVars
      }
    };

    const body = JSON.stringify(bodyObj);
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
    req.write(body);
    req.end();
  });
}

// Execute test
(async () => {
  try {
    // Step 1: Get current config
    console.log('Step 1: Getting current environment variables...');
    const config = await getCurrentConfig();
    let envVars = config.Environment?.Variables || {};
    console.log('Current countries:', Object.keys(envVars).filter(k => k.startsWith('HOLIDAYS_')).map(k => k.replace('HOLIDAYS_', '')).join(', '));
    console.log('');
    
    // Step 2: Update UK
    console.log('Step 2: Updating UK holidays to Dec 20-25, 2026...');
    await updateCountry('UK', '2026-12-20', '2026-12-25', '+00:00', { ...envVars });
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for propagation
    
    const afterUK = await getCurrentConfig();
    envVars = afterUK.Environment?.Variables || {};
    console.log('✅ UK updated. Current countries:', Object.keys(envVars).filter(k => k.startsWith('HOLIDAYS_')).map(k => k.replace('HOLIDAYS_', '')).join(', '));
    console.log('');
    
    // Step 3: Update US
    console.log('Step 3: Updating US holidays to Dec 23-27, 2026...');
    await updateCountry('US', '2026-12-23', '2026-12-27', '-05:00', { ...envVars });
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for propagation
    
    const afterUS = await getCurrentConfig();
    envVars = afterUS.Environment?.Variables || {};
    console.log('✅ US updated. Current countries:', Object.keys(envVars).filter(k => k.startsWith('HOLIDAYS_')).map(k => k.replace('HOLIDAYS_', '')).join(', '));
    console.log('');
    
    // Step 4: Verify both are still there
    console.log('=== VERIFICATION ===');
    const ukHolidays = envVars.HOLIDAYS_UK;
    const usHolidays = envVars.HOLIDAYS_US;
    
    if (ukHolidays && usHolidays) {
      console.log('✅ SUCCESS - Both UK and US holidays are preserved!');
      console.log('UK:', ukHolidays);
      console.log('US:', usHolidays);
    } else {
      console.log('❌ FAILED - One or more countries missing:');
      console.log('UK present:', !!ukHolidays);
      console.log('US present:', !!usHolidays);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
