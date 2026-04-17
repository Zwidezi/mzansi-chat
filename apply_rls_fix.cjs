const fs = require('node:fs');
const https = require('node:https');

const TOKEN = 'sbp_2e312e0ae2b107136da3f9b243c232316f814d36';
const PROJECT_REF = 'uweiptzbtpojnwyozdzf';
const SQL_PATH = 'production_consolidated_fix.sql';

if (!fs.existsSync(SQL_PATH)) {
  console.error(`[Error] SQL file not found: ${SQL_PATH}`);
  process.exit(1);
}

const SQL = fs.readFileSync(SQL_PATH, 'utf8');

const data = JSON.stringify({ 
  project_ref: PROJECT_REF,
  query: SQL 
});

const options = {
  hostname: 'api.supabase.com',
  port: 443,
  path: `/v1/queries`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log(`[Deploy] Applying ${SQL_PATH} to project ${PROJECT_REF}...`);

const req = https.request(options, (res) => {
  let responseBody = '';
  res.on('data', (d) => { responseBody += d; });
  res.on('end', () => {
    console.log(`[Deploy] Status: ${res.statusCode}`);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('[Deploy] SUCCESS: SQL applied successfully!');
    } else {
      console.error('[Deploy] FAILURE:', responseBody);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('[Deploy] Network Error:', error);
  process.exit(1);
});

req.write(data);
req.end();
