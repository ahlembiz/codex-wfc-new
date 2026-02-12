import type {
  ToolClusterData, ResearchDataPointData, BiasAuditCheck,
  ClusterFuckStats, ClusterFilters, RecipeResearchFilters, ResearchDataFilters,
} from '../types';

const API_BASE = typeof process !== 'undefined' && process.env?.VITE_API_URL
  ? process.env.VITE_API_URL
  : '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ========== Clusters ==========

export async function getClusters(filters: ClusterFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.confidenceMin !== undefined) params.set('confidence_min', String(filters.confidenceMin));
  if (filters.synergyType) params.set('synergy_type', filters.synergyType);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return fetchJson<{ clusters: ToolClusterData[]; total: number; page: number; limit: number }>(
    `${API_BASE}/admin/clusters${qs ? `?${qs}` : ''}`,
  );
}

export async function getClusterById(id: string) {
  return fetchJson<ToolClusterData>(`${API_BASE}/admin/clusters/${id}`);
}

export async function createCluster(data: Partial<ToolClusterData> & { toolIds?: Array<{ toolId: string; role?: string }> }) {
  return fetchJson<ToolClusterData>(`${API_BASE}/admin/clusters`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCluster(id: string, data: Record<string, unknown>) {
  return fetchJson<ToolClusterData>(`${API_BASE}/admin/clusters/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function bulkUpdateClusters(ids: string[], action: string, notes?: string) {
  return fetchJson<{ updated: number }>(`${API_BASE}/admin/clusters/bulk`, {
    method: 'POST',
    body: JSON.stringify({ ids, action, notes }),
  });
}

// ========== Recipes ==========

export async function getResearchRecipes(filters: RecipeResearchFilters = {}) {
  const params = new URLSearchParams();
  if (filters.researchStatus) params.set('research_status', filters.researchStatus);
  if (filters.confidenceMin !== undefined) params.set('confidence_min', String(filters.confidenceMin));
  if (filters.connectorType) params.set('connector_type', filters.connectorType);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return fetchJson<{ recipes: any[]; total: number; page: number; limit: number }>(
    `${API_BASE}/admin/recipes${qs ? `?${qs}` : ''}`,
  );
}

export async function updateRecipeResearch(id: string, data: Record<string, unknown>) {
  return fetchJson<any>(`${API_BASE}/admin/recipes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function bulkUpdateRecipes(ids: string[], action: string, notes?: string) {
  return fetchJson<{ updated: number }>(`${API_BASE}/admin/recipes/bulk`, {
    method: 'POST',
    body: JSON.stringify({ ids, action, notes }),
  });
}

// ========== Research Data ==========

export async function getResearchData(filters: ResearchDataFilters = {}) {
  const params = new URLSearchParams();
  if (filters.sourceType) params.set('source_type', filters.sourceType);
  if (filters.status) params.set('status', filters.status);
  if (filters.confidenceMin !== undefined) params.set('confidence_min', String(filters.confidenceMin));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return fetchJson<{ dataPoints: ResearchDataPointData[]; total: number; page: number; limit: number }>(
    `${API_BASE}/admin/research-data${qs ? `?${qs}` : ''}`,
  );
}

export async function createDataPoint(data: Record<string, unknown>) {
  return fetchJson<ResearchDataPointData>(`${API_BASE}/admin/research-data`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDataPointStatus(id: string, status: string) {
  return fetchJson<ResearchDataPointData>(`${API_BASE}/admin/research-data/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ========== Bias Audit & Stats ==========

export async function getBiasAudit() {
  return fetchJson<{ checks: BiasAuditCheck[] }>(`${API_BASE}/admin/bias-audit`);
}

export async function getClusterFuckStats() {
  return fetchJson<ClusterFuckStats>(`${API_BASE}/admin/cluster-fuck/stats`);
}
