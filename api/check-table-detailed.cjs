const https = require('https');

const data = JSON.stringify({
  sql: `
    SELECT 
      c.column_name, 
      c.data_type,
      t.tgname as trigger_name
    FROM information_schema.columns c
    LEFT JOIN pg_attribute a ON a.attname = c.column_name 
      AND a.attrelid = 'leave_requests'::regclass
    LEFT JOIN pg_trigger t ON t.tgrelid = 'leave_requests'::regclass 
      AND t.tgname NOT LIKE 'pg_%'
    WHERE c.table_name = 'leave_requests'
    ORDER BY c.ordinal_position;
  `
});

const options = {
  hostname: 'hr-api-wbzs.onrender.com',
  port: 443,
  path: '/api/migrate-db',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Response:', body);
  });
});

req.on('error', (error) => console.error('Error:', error));
req.write(data);
req.end();

