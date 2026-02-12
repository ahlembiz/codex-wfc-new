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
import toolEnrichHandler from './api/tools/[id]/enrich';
import bundlesHandler from './api/bundles';

// Admin: Research Intelligence
import adminClustersHandler from './api/admin/clusters/index';
import adminClusterByIdHandler from './api/admin/clusters/[id]';
import adminClustersBulkHandler from './api/admin/clusters/bulk';
import adminRecipesHandler from './api/admin/recipes/index';
import adminRecipeByIdHandler from './api/admin/recipes/[id]';
import adminRecipesBulkHandler from './api/admin/recipes/bulk';
import adminResearchDataHandler from './api/admin/research-data/index';
import adminResearchDataByIdHandler from './api/admin/research-data/[id]';
import adminBiasAuditHandler from './api/admin/bias-audit';
import adminClusterFuckStatsHandler from './api/admin/cluster-fuck/stats';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Read body for POST/PUT/PATCH/DELETE requests
  let body = '';
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
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
    } else if (url.match(/^\/api\/tools\/[^\/]+\/enrich\/?$/)) {
      // Enrich endpoint - must be before generic [id] route
      const id = url.split('/api/tools/')[1].split('/enrich')[0];
      vercelReq.query = { ...vercelReq.query, id };
      await toolEnrichHandler(vercelReq, vercelRes);
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
    }
    // Admin: Research Intelligence routes
    else if (url === '/api/admin/clusters/bulk' || url === '/api/admin/clusters/bulk/') {
      await adminClustersBulkHandler(vercelReq, vercelRes);
    } else if (url.match(/^\/api\/admin\/clusters\/[^\/]+\/?$/) && !url.includes('bulk')) {
      const id = url.split('/api/admin/clusters/')[1].replace(/\/$/, '');
      vercelReq.query = { ...vercelReq.query, id };
      await adminClusterByIdHandler(vercelReq, vercelRes);
    } else if (url === '/api/admin/clusters' || url === '/api/admin/clusters/' || url.startsWith('/api/admin/clusters?')) {
      await adminClustersHandler(vercelReq, vercelRes);
    } else if (url === '/api/admin/recipes/bulk' || url === '/api/admin/recipes/bulk/') {
      await adminRecipesBulkHandler(vercelReq, vercelRes);
    } else if (url.match(/^\/api\/admin\/recipes\/[^\/]+\/?$/) && !url.includes('bulk')) {
      const id = url.split('/api/admin/recipes/')[1].replace(/\/$/, '');
      vercelReq.query = { ...vercelReq.query, id };
      await adminRecipeByIdHandler(vercelReq, vercelRes);
    } else if (url === '/api/admin/recipes' || url === '/api/admin/recipes/' || url.startsWith('/api/admin/recipes?')) {
      await adminRecipesHandler(vercelReq, vercelRes);
    } else if (url.match(/^\/api\/admin\/research-data\/[^\/]+\/?$/)) {
      const id = url.split('/api/admin/research-data/')[1].replace(/\/$/, '');
      vercelReq.query = { ...vercelReq.query, id };
      await adminResearchDataByIdHandler(vercelReq, vercelRes);
    } else if (url === '/api/admin/research-data' || url === '/api/admin/research-data/' || url.startsWith('/api/admin/research-data?')) {
      await adminResearchDataHandler(vercelReq, vercelRes);
    } else if (url === '/api/admin/bias-audit' || url === '/api/admin/bias-audit/') {
      await adminBiasAuditHandler(vercelReq, vercelRes);
    } else if (url === '/api/admin/cluster-fuck/stats' || url === '/api/admin/cluster-fuck/stats/') {
      await adminClusterFuckStatsHandler(vercelReq, vercelRes);
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
  GET    /api/health            - Health check
  POST   /api/diagnose          - Generate diagnosis scenarios
  GET    /api/tools             - List all tools
  POST   /api/tools             - Create a new tool
  POST   /api/tools/match       - Match tool names
  GET    /api/tools/:id         - Get a tool by ID
  PUT    /api/tools/:id         - Update a tool
  PATCH  /api/tools/:id         - Partial update (popularity sub-scores)
  DELETE /api/tools/:id         - Delete a tool
  POST   /api/tools/:id/enrich  - AI-powered data enrichment
  GET    /api/bundles           - List all bundles

  Admin - Research Intelligence:
  GET/POST /api/admin/clusters     - List/create clusters
  GET/PATCH /api/admin/clusters/:id - Get/update cluster
  POST   /api/admin/clusters/bulk  - Bulk approve/reject/flag
  GET    /api/admin/recipes        - List recipes (research-enhanced)
  PATCH  /api/admin/recipes/:id    - Update recipe research metadata
  POST   /api/admin/recipes/bulk   - Bulk approve/reject
  GET/POST /api/admin/research-data - List/create data points
  PATCH  /api/admin/research-data/:id - Update data point status
  GET    /api/admin/bias-audit     - Run bias audit (12 checks)
  GET    /api/admin/cluster-fuck/stats - Aggregate stats

Set VITE_API_URL=http://localhost:${PORT}/api in .env.local
`);
});
