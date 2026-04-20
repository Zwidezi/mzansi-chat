const https = require('node:https');

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = 'uweiptzbtpojnwyozdzf';

const options = {
  hostname: 'api.supabase.com',
  port: 443,
  path: `/v1/projects`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept': 'application/json'
  }
};

console.log(`[Verify] Fetching projects for current token...`);

const req = https.request(options, (res) => {
  let responseBody = '';
  res.on('data', (d) => { responseBody += d; });
  res.on('end', () => {
    console.log(`[Verify] Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      const projects = JSON.parse(responseBody);
      const found = projects.find(p => p.id === PROJECT_REF);
      if (found) {
        console.log(`[Verify] SUCCESS: Token is valid for project: ${found.name} (${found.id})`);
      } else {
        console.error(`[Verify] FAILURE: Project ${PROJECT_REF} not found in user's profile.`);
        console.log('[Verify] Available Projects:', projects.map(p => `${p.id} (${p.name})`));
      }
    } else {
      console.error('[Verify] API Error:', responseBody);
    }
  });
});

req.on('error', (e) => { console.error('[Verify] Error:', e); });
req.end();
