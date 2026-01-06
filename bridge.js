const http = require('http');

const API_KEY = 'dev-api-key-12345';
const BASE_URL = 'https://mcpserver-production-e608.up.railway.app';

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(404);
    return res.end('Not found');
  }
  
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { tool, args } = JSON.parse(body);
      const response = await fetch(`${BASE_URL}/api/tools/${tool}`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(args)
      });
      const data = await response.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

server.listen(3000, () => {
  console.log('✓ Bridge server running on http://localhost:3000');
  console.log('Ready to forward requests to Railway MCP server');
});
