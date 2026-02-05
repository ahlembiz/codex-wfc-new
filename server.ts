/**
 * Local development server for API routes
 * Run with: npx tsx server.ts
 */

import http from 'http';
import { parse } from 'url';

// Import API handlers
import healthHandler from './api/health';
import diagnoseHandler from './api/diagnose';
import toolsHandler from './api/tools/index';
import toolsMatchHandler from './api/tools/match';
import toolByIdHandler from './api/tools/[id]';
import bundlesHandler from './api/bundles';

const PORT = 3005;

// Simple request/response adapter for Vercel handlers
function createVercelRequest(req: http.IncomingMessage, body: string) {
  const parsed = parse(req.url || '/', true);
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: parsed.query,
    body: body ? JSON.parse(body) : undefined,
  };
}

function createVercelResponse(res: http.ServerResponse) {
  return {
    status: (code: number) => {
      res.statusCode = code;
      return {
        json: (data: unknown) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        },
        end: () => res.end(),
      };
    },
    setHeader: (name: string, value: string) => {
      res.setHeader(name, value);
    },
    json: (data: unknown) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    },
    end: () => res.end(),
  };
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Read body for POST/PATCH requests
  let body = '';
  if (req.method === 'POST' || req.method === 'PATCH') {
    for await (const chunk of req) {
      body += chunk;
    }
  }

  const vercelReq = createVercelRequest(req, body) as any;
  const vercelRes = createVercelResponse(res) as any;

  const url = req.url || '/';

  try {
    if (url === '/api/health' || url === '/api/health/') {
      await healthHandler(vercelReq, vercelRes);
    } else if (url === '/api/diagnose' || url === '/api/diagnose/') {
      await diagnoseHandler(vercelReq, vercelRes);
    } else if (url.match(/^\/api\/tools\/[^\/]+$/) && !url.includes('match')) {
      const id = url.split('/api/tools/')[1];
      vercelReq.query = { ...vercelReq.query, id };
      await toolByIdHandler(vercelReq, vercelRes);
    } else if (url === '/api/tools' || url === '/api/tools/' || url.startsWith('/api/tools?')) {
      await toolsHandler(vercelReq, vercelRes);
    } else if (url === '/api/tools/match' || url === '/api/tools/match/') {
      await toolsMatchHandler(vercelReq, vercelRes);
    } else if (url === '/api/bundles' || url === '/api/bundles/' || url.startsWith('/api/bundles?')) {
      await bundlesHandler(vercelReq, vercelRes);
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found', path: url }));
    }
  } catch (error) {
    console.error('API Error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error', message: String(error) }));
  }
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`
🚀 API Server running at http://localhost:${PORT}

Available endpoints:
  GET   /api/health        - Health check
  POST  /api/diagnose      - Generate diagnosis scenarios
  GET   /api/tools         - List all tools
  POST  /api/tools/match   - Match tool names
  PATCH /api/tools/:id     - Update tool popularity sub-scores
  GET   /api/bundles       - List all bundles

Set VITE_API_URL=http://localhost:${PORT}/api in .env.local
`);
});
